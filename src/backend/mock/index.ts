// MockBackend — an in-memory implementation of BackendAdapter used for
// development and demos. State lives in memory (source of truth) and is
// mirrored to AsyncStorage so it survives an app reload.
//
// Realtime is *simulated*: subscribe* methods register against a tiny internal
// event emitter, and mutations notify subscribers after a random delay so the
// mock feels like it is talking to a real backend. The delay is injectable so
// tests can run fast.
//
// BOT BEHAVIOR (see ./bots.ts for the pure decision/content logic wired in here):
//   - Availability rotation: only 1–3 of the ~25 seed bots are "available" at
//     any moment; the set drifts on a 3–10 min timer. The rotation loop is
//     started lazily on the first `subscribeNearby` and stopped once the last
//     nearby subscriber unsubscribes, so a fresh MockBackend starts no timers.
//   - Order responses: an order created against a seed bot gets an auto
//     accept/decline decision after a 5–20 s delay (re-reading the possibly
//     raised price), followed — on accept — by a scripted chat sequence.
//   - Customer-bot requests: while the signed-in user is available, a random
//     bot originates an order against them every 5–15 min; when the user accepts,
//     the bot sends its scripted customer-side chat.
// All timer ranges are constructor-injectable; `dispose()` clears every timer.

import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  AuthApi,
  BackendAdapter,
  ChatApi,
  CreateOrderInput,
  OnboardingState,
  OrderResponse,
  OrdersApi,
  PresenceApi,
  RatingsApi,
} from "../adapter";
import type {
  AvatarId,
  ChatMessage,
  GeoPoint,
  Order,
  Rating,
  RaterRole,
  RatingSummary,
  ScratcherProfile,
  Unsubscribe,
  User,
} from "../types";
import {
  buildBotCustomerOrderTerms,
  buildCustomerChatLines,
  buildScratcherChatLines,
  isSeedBotId,
  nextAvailableFlags,
  pickDeclineReason,
  pickEtaMinutes,
  shouldBotAccept,
  type Rng,
} from "./bots";
import { SCRATCHER_SEEDS, type ScratcherSeed } from "./seed";

const STORAGE_KEY = "@gardan/mock/v1";
const DEMO_VERIFY_CODE = "000000";
const DEFAULT_MIN_DELAY_MS = 1500;
const DEFAULT_MAX_DELAY_MS = 8000;

// Real-feel bot timing defaults (all constructor-injectable for fast tests).
const DEFAULT_BOT_DECISION_MIN_MS = 5000; // order accept/decline: 5–20 s
const DEFAULT_BOT_DECISION_MAX_MS = 20000;
const DEFAULT_BOT_CHAT_STEP_MIN_MS = 1500; // between scripted chat lines: a few s
const DEFAULT_BOT_CHAT_STEP_MAX_MS = 4000;
const DEFAULT_BOT_ROTATION_MIN_MS = 3 * 60 * 1000; // availability window: 3–10 min
const DEFAULT_BOT_ROTATION_MAX_MS = 10 * 60 * 1000;
const DEFAULT_BOT_CUSTOMER_REQ_MIN_MS = 5 * 60 * 1000; // bot-originated req: 5–15 min
const DEFAULT_BOT_CUSTOMER_REQ_MAX_MS = 15 * 60 * 1000;

/** Center used to place seed scratchers (roughly central Tel Aviv). */
const SEED_CENTER: GeoPoint = { lat: 32.0809, lng: 34.7806 };

/** Minimal persistence surface — AsyncStorage satisfies this. */
export interface StorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface MockBackendOptions {
  /** Lower bound of the simulated notify delay, ms. Default 1500. */
  minDelayMs?: number;
  /** Upper bound of the simulated notify delay, ms. Default 8000. */
  maxDelayMs?: number;
  /** Storage backend. Defaults to AsyncStorage. */
  storage?: StorageLike;
  /** Lower bound of a bot's order accept/decline delay, ms. Default 5000. */
  botDecisionMinMs?: number;
  /** Upper bound of a bot's order accept/decline delay, ms. Default 20000. */
  botDecisionMaxMs?: number;
  /** Lower bound of the gap between scripted bot chat lines, ms. Default 1500. */
  botChatStepMinMs?: number;
  /** Upper bound of the gap between scripted bot chat lines, ms. Default 4000. */
  botChatStepMaxMs?: number;
  /** Lower bound of the availability-rotation window, ms. Default 180000. */
  botAvailabilityRotationMinMs?: number;
  /** Upper bound of the availability-rotation window, ms. Default 600000. */
  botAvailabilityRotationMaxMs?: number;
  /** Lower bound between bot-originated customer requests, ms. Default 300000. */
  botCustomerRequestMinMs?: number;
  /** Upper bound between bot-originated customer requests, ms. Default 900000. */
  botCustomerRequestMaxMs?: number;
  /**
   * Random source in [0, 1) for all bot decisions (accept curve, ETA, rotation,
   * decline reason, generated request terms). Defaults to Math.random. Inject a
   * fixed function to make bot behavior deterministic in tests.
   */
  rng?: Rng;
}

/** The slice of state that is persisted across reloads. */
interface PersistedState {
  currentUserId: string | null;
  users: Record<string, User>;
  onboarding: OnboardingState;
  orders: Record<string, Order>;
  messages: Record<string, ChatMessage[]>;
  ratings: Rating[];
}

type Listener = (payload: unknown) => void;

function emptyState(): PersistedState {
  return {
    currentUserId: null,
    users: {},
    onboarding: { onboardingCompleted: false, termsAccepted: false },
    orders: {},
    messages: {},
    ratings: [],
  };
}

function oppositeRole(role: RaterRole): RaterRole {
  return role === "customer" ? "scratcher" : "customer";
}

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A seed persona hydrated into a live scratcher profile (a bot). */
interface BotState {
  seed: ScratcherSeed;
  location: GeoPoint;
  isAvailable: boolean;
}

export class MockBackend implements BackendAdapter {
  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly storage: StorageLike;
  private readonly rng: Rng;

  private readonly botDecisionMinMs: number;
  private readonly botDecisionMaxMs: number;
  private readonly botChatStepMinMs: number;
  private readonly botChatStepMaxMs: number;
  private readonly botRotationMinMs: number;
  private readonly botRotationMaxMs: number;
  private readonly botCustomerReqMinMs: number;
  private readonly botCustomerReqMaxMs: number;

  private state: PersistedState = emptyState();
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly bots: BotState[];
  private idCounter = 0;
  private loadPromise: Promise<void> | null = null;

  /** Live nearby subscribers, each keyed to its own origin so rotation can
   *  re-emit a per-origin snapshot. */
  private readonly nearbySubscribers = new Set<{
    origin: GeoPoint;
    onChange: (profiles: ScratcherProfile[]) => void;
  }>();
  /** Every outstanding internal timer, so dispose() can clear them all. */
  private readonly pendingTimers = new Set<ReturnType<typeof setTimeout>>();
  private rotationTimer: ReturnType<typeof setTimeout> | null = null;
  private customerRequestTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: MockBackendOptions = {}) {
    this.minDelayMs = options.minDelayMs ?? DEFAULT_MIN_DELAY_MS;
    this.maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    this.storage = options.storage ?? AsyncStorage;
    this.rng = options.rng ?? Math.random;

    this.botDecisionMinMs = options.botDecisionMinMs ?? DEFAULT_BOT_DECISION_MIN_MS;
    this.botDecisionMaxMs = options.botDecisionMaxMs ?? DEFAULT_BOT_DECISION_MAX_MS;
    this.botChatStepMinMs = options.botChatStepMinMs ?? DEFAULT_BOT_CHAT_STEP_MIN_MS;
    this.botChatStepMaxMs = options.botChatStepMaxMs ?? DEFAULT_BOT_CHAT_STEP_MAX_MS;
    this.botRotationMinMs =
      options.botAvailabilityRotationMinMs ?? DEFAULT_BOT_ROTATION_MIN_MS;
    this.botRotationMaxMs =
      options.botAvailabilityRotationMaxMs ?? DEFAULT_BOT_ROTATION_MAX_MS;
    this.botCustomerReqMinMs =
      options.botCustomerRequestMinMs ?? DEFAULT_BOT_CUSTOMER_REQ_MIN_MS;
    this.botCustomerReqMaxMs =
      options.botCustomerRequestMaxMs ?? DEFAULT_BOT_CUSTOMER_REQ_MAX_MS;

    // Bots are derived from the static seed pool at construction; they are not
    // persisted (they are regenerated deterministically every run). Only 1–3
    // start available (product spec), rotating over time once someone watches.
    const initialFlags = nextAvailableFlags(SCRATCHER_SEEDS.length, this.rng);
    this.bots = SCRATCHER_SEEDS.map((seed, i) => ({
      seed,
      location: {
        lat: SEED_CENTER.lat + (((i % 5) - 2) * 0.006),
        lng: SEED_CENTER.lng + ((Math.floor(i / 5) - 2) * 0.006),
      },
      isAvailable: initialFlags[i] ?? false,
    }));
  }

  /**
   * Stop every internal timer (rotation, customer-request loop, pending bot
   * decisions and chat steps). Idempotent. Call this in test teardown so no
   * repeating timer keeps the Jest process alive.
   */
  dispose(): void {
    for (const timer of this.pendingTimers) clearTimeout(timer);
    this.pendingTimers.clear();
    this.rotationTimer = null;
    this.customerRequestTimer = null;
  }

  /** setTimeout whose handle is tracked (and auto-removed on fire) for dispose(). */
  private track(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      this.pendingTimers.delete(timer);
      fn();
    }, ms);
    this.pendingTimers.add(timer);
    return timer;
  }

  private randRange(min: number, max: number): number {
    return min + this.rng() * Math.max(0, max - min);
  }

  // ---- persistence -------------------------------------------------------

  private async ensureLoaded(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.load();
    }
    return this.loadPromise;
  }

  private async load(): Promise<void> {
    const raw = await this.storage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this.state = { ...emptyState(), ...(JSON.parse(raw) as PersistedState) };
      } catch {
        this.state = emptyState();
      }
    }
  }

  private async persist(): Promise<void> {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  // ---- realtime emitter --------------------------------------------------

  private on(channel: string, listener: Listener): Unsubscribe {
    let set = this.listeners.get(channel);
    if (!set) {
      set = new Set();
      this.listeners.set(channel, set);
    }
    set.add(listener);
    return () => {
      const current = this.listeners.get(channel);
      if (current) {
        current.delete(listener);
        if (current.size === 0) this.listeners.delete(channel);
      }
    };
  }

  private randomDelay(): number {
    return this.minDelayMs + Math.random() * Math.max(0, this.maxDelayMs - this.minDelayMs);
  }

  /** Notify a channel's listeners after a random, backend-like delay. */
  private scheduleEmit(channel: string, factory: () => unknown): void {
    setTimeout(() => {
      const set = this.listeners.get(channel);
      if (!set) return;
      const payload = factory();
      for (const listener of set) listener(payload);
    }, this.randomDelay());
  }

  private nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}_${Date.now().toString(36)}_${this.idCounter.toString(36)}`;
  }

  private requireCurrentUser(): User {
    const user = this.currentUserOrNull();
    if (!user) throw new Error("No current user. Sign up and verify first.");
    return user;
  }

  private currentUserOrNull(): User | null {
    const id = this.state.currentUserId;
    return (id && this.state.users[id]) || null;
  }

  private botToProfile(bot: BotState, origin: GeoPoint): ScratcherProfile {
    const { seed } = bot;
    return {
      id: seed.id,
      name: seed.name,
      avatarId: seed.avatarId,
      rating: { average: seed.baseRating, count: seed.completedCount },
      completedCount: seed.completedCount,
      specialty: { zone: seed.specialtyZone, intensity: seed.specialtyIntensity },
      distanceKm: Math.round(haversineKm(origin, bot.location) * 10) / 10,
      location: bot.location,
      isAvailable: bot.isAvailable,
      isBot: true,
    };
  }

  private nearbyProfiles(origin: GeoPoint): ScratcherProfile[] {
    return this.bots
      .filter((b) => b.isAvailable)
      .map((b) => this.botToProfile(b, origin))
      .sort((x, y) => x.distanceKm - y.distanceKm);
  }

  // ---- auth --------------------------------------------------------------

  readonly auth: AuthApi = {
    signUp: async (name: string, phone: string) => {
      await this.ensureLoaded();
      const id = this.nextId("u");
      const emptyRating: RatingSummary = { average: 0, count: 0 };
      const user: User = {
        id,
        name,
        phone,
        avatarId: "a1",
        createdAt: Date.now(),
        isAvailable: false,
        location: null,
        ratings: { asCustomer: { ...emptyRating }, asScratcher: { ...emptyRating } },
      };
      this.state.users[id] = user;
      await this.persist();
      return { userId: id };
    },

    verifyCode: async (userId: string, code: string) => {
      await this.ensureLoaded();
      if (code !== DEMO_VERIFY_CODE) {
        throw new Error("Invalid verification code.");
      }
      const user = this.state.users[userId];
      if (!user) throw new Error("Unknown user.");
      this.state.currentUserId = userId;
      await this.persist();
      return user;
    },

    getCurrentUser: async () => {
      await this.ensureLoaded();
      const id = this.state.currentUserId;
      return (id && this.state.users[id]) || null;
    },

    updateAvatar: async (avatarId: AvatarId) => {
      await this.ensureLoaded();
      const current = this.requireCurrentUser();
      const user = this.replaceUser(current.id, (u) => {
        u.avatarId = avatarId;
      });
      if (!user) throw new Error("Unknown user.");
      await this.persist();
      return user;
    },

    getOnboardingState: async () => {
      await this.ensureLoaded();
      return { ...this.state.onboarding };
    },

    setOnboardingState: async (patch: Partial<OnboardingState>) => {
      await this.ensureLoaded();
      this.state.onboarding = { ...this.state.onboarding, ...patch };
      await this.persist();
      return { ...this.state.onboarding };
    },
  };

  // ---- presence ----------------------------------------------------------

  readonly presence: PresenceApi = {
    setAvailability: async (isAvailable: boolean) => {
      await this.ensureLoaded();
      const current = this.requireCurrentUser();
      const user = this.replaceUser(current.id, (u) => {
        u.isAvailable = isAvailable;
      });
      if (!user) throw new Error("Unknown user.");
      await this.persist();
      // Bot-originated customer requests only flow while the user is available.
      if (isAvailable) this.startCustomerRequestLoop();
      else this.stopCustomerRequestLoop();
      return user;
    },

    listNearby: async (origin: GeoPoint) => {
      await this.ensureLoaded();
      return this.nearbyProfiles(origin);
    },

    subscribeNearby: (origin: GeoPoint, onChange) => {
      const sub = { origin, onChange };
      this.nearbySubscribers.add(sub);
      // Start the availability-rotation loop lazily on the first live watcher.
      this.startRotationLoop();
      // Emit an initial snapshot to THIS subscriber only, after a backend-like
      // delay, so it sees the current available set immediately.
      const timer = this.track(
        () => onChange(this.nearbyProfiles(origin)),
        this.randomDelay(),
      );
      return () => {
        clearTimeout(timer);
        this.pendingTimers.delete(timer);
        this.nearbySubscribers.delete(sub);
        // Stop rotating once nobody is watching — no dangling timers.
        if (this.nearbySubscribers.size === 0) this.stopRotationLoop();
      };
    },
  };

  // ---- bot: availability rotation ---------------------------------------

  /** Begin (if not already) the timer that drifts the available bot set. */
  private startRotationLoop(): void {
    if (this.rotationTimer !== null) return;
    this.scheduleRotation();
  }

  private stopRotationLoop(): void {
    if (this.rotationTimer !== null) {
      clearTimeout(this.rotationTimer);
      this.pendingTimers.delete(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  private scheduleRotation(): void {
    const timer = setTimeout(() => {
      this.pendingTimers.delete(timer);
      const flags = nextAvailableFlags(this.bots.length, this.rng);
      this.bots.forEach((bot, i) => {
        bot.isAvailable = flags[i] ?? false;
      });
      // Re-emit a fresh per-origin snapshot to every live nearby subscriber.
      for (const sub of this.nearbySubscribers) {
        sub.onChange(this.nearbyProfiles(sub.origin));
      }
      // Keep rotating only while someone is still watching.
      if (this.nearbySubscribers.size > 0) this.scheduleRotation();
      else this.rotationTimer = null;
    }, this.randRange(this.botRotationMinMs, this.botRotationMaxMs));
    this.pendingTimers.add(timer);
    this.rotationTimer = timer;
  }

  // ---- bot: customer-originated requests --------------------------------

  private startCustomerRequestLoop(): void {
    if (this.customerRequestTimer !== null) return;
    this.scheduleCustomerRequest();
  }

  private stopCustomerRequestLoop(): void {
    if (this.customerRequestTimer !== null) {
      clearTimeout(this.customerRequestTimer);
      this.pendingTimers.delete(this.customerRequestTimer);
      this.customerRequestTimer = null;
    }
  }

  private scheduleCustomerRequest(): void {
    const timer = setTimeout(() => {
      this.pendingTimers.delete(timer);
      void this.originateBotCustomerOrder();
      // Reschedule only while the signed-in user is still available.
      const me = this.currentUserOrNull();
      if (me?.isAvailable) this.scheduleCustomerRequest();
      else this.customerRequestTimer = null;
    }, this.randRange(this.botCustomerReqMinMs, this.botCustomerReqMaxMs));
    this.pendingTimers.add(timer);
    this.customerRequestTimer = timer;
  }

  /**
   * Internal path (the public `orders.create` assumes the signed-in user is the
   * customer): a random available bot originates an order AGAINST the real user,
   * i.e. bot = customerId, real user = scratcherId. Emits on the order channel.
   */
  private async originateBotCustomerOrder(): Promise<void> {
    await this.ensureLoaded();
    const me = this.currentUserOrNull();
    if (!me || !me.isAvailable) return;
    const available = this.bots.filter((b) => b.isAvailable);
    if (available.length === 0) return;
    const bot = available[Math.floor(this.rng() * available.length)];
    if (!bot) return;

    const terms = buildBotCustomerOrderTerms(this.rng);
    const id = this.nextId("o");
    const order: Order = {
      id,
      customerId: bot.seed.id,
      scratcherId: me.id,
      zone: terms.zone,
      intensity: terms.intensity,
      durationMinutes: terms.durationMinutes,
      price: terms.price,
      status: "pending",
      createdAt: Date.now(),
    };
    this.state.orders[id] = order;
    await this.persist();
    this.scheduleEmit(`order:${id}`, () => this.state.orders[id]);
  }

  // ---- orders ------------------------------------------------------------

  readonly orders: OrdersApi = {
    create: async (input: CreateOrderInput) => {
      await this.ensureLoaded();
      const user = this.requireCurrentUser();
      const id = this.nextId("o");
      const order: Order = {
        id,
        customerId: user.id,
        scratcherId: input.scratcherId,
        zone: input.zone,
        intensity: input.intensity,
        durationMinutes: input.durationMinutes,
        price: input.price,
        status: "pending",
        createdAt: Date.now(),
      };
      this.state.orders[id] = order;
      await this.persist();
      this.scheduleEmit(`order:${id}`, () => this.state.orders[id]);
      // If the target is a seed bot, schedule its auto accept/decline decision.
      const botSeed = SCRATCHER_SEEDS.find((s) => s.id === input.scratcherId);
      if (botSeed) this.scheduleBotDecision(id, botSeed);
      return order;
    },

    raisePrice: async (orderId: string, newPrice: number) => {
      const order = await this.mutateOrder(orderId, (o) => {
        if (o.status !== "pending") {
          throw new Error("Can only raise price on a pending order.");
        }
        o.price = newPrice;
      });
      return order;
    },

    respond: async (orderId: string, response: OrderResponse) => {
      const order = await this.mutateOrder(orderId, (o) =>
        this.applyOrderResponse(o, response),
      );
      // If the real user (scratcher mode) just accepted a bot-originated request,
      // the bot (customer) sends its scripted customer-side chat lines.
      if (response.accept && isSeedBotId(order.customerId)) {
        this.scheduleBotChat(order.id, order.customerId, buildCustomerChatLines());
      }
      return order;
    },

    markComplete: async (orderId: string) => {
      const order = await this.mutateOrder(orderId, (o) => {
        if (o.status !== "accepted" && o.status !== "in_progress") {
          throw new Error("Order must be accepted before completing.");
        }
        o.status = "completed";
        o.completedAt = Date.now();
      });
      return order;
    },

    cancel: async (orderId: string, reason?: string) => {
      const order = await this.mutateOrder(orderId, (o) => {
        if (o.status === "completed" || o.status === "rated") {
          throw new Error("Cannot cancel a finished order.");
        }
        o.status = "cancelled";
        if (reason !== undefined) o.declineReason = reason;
      });
      return order;
    },

    getById: async (orderId: string) => {
      await this.ensureLoaded();
      return this.state.orders[orderId] ?? null;
    },

    subscribeOrder: (orderId: string, onChange) => {
      const listener: Listener = (p) => onChange(p as Order);
      return this.on(`order:${orderId}`, listener);
    },

    listIncoming: async () => {
      await this.ensureLoaded();
      const me = this.requireCurrentUser();
      return Object.values(this.state.orders).filter(
        (o) => o.scratcherId === me.id && o.status === "pending",
      );
    },

    listHistory: async () => {
      await this.ensureLoaded();
      const me = this.requireCurrentUser();
      return Object.values(this.state.orders)
        .filter((o) => o.customerId === me.id || o.scratcherId === me.id)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
  };

  // בונה עותק חדש ורק אז ממטב — לעולם לא ממטבים object קיים ב-state במקום.
  // סיבה קריטית, נתפסה בבדיקה חיה: מסכי UI ששומרים ישות ב-state מקומי
  // (למשל דרך getById בעליה הראשונית) מחזיקים את אותו ה-reference בדיוק
  // שב-this.state. מיטוב במקום ואז setState/set() עם אותו reference נבלם על
  // ידי הבדיקה Object.is של React/Zustand (התוכן השתנה, ה-reference לא) —
  // המצב מתעדכן נכון בפנים אבל לעולם לא נראה על המסך בלי רענון. כל מיטוב
  // ישות משותפת (Order/User) עובר דרך replaceOrder/replaceUser בשביל זה.
  private replaceOrder(orderId: string, mutate: (order: Order) => void): Order | null {
    const existing = this.state.orders[orderId];
    if (!existing) return null;
    const order = { ...existing };
    mutate(order);
    this.state.orders[orderId] = order;
    return order;
  }

  private replaceUser(userId: string, mutate: (user: User) => void): User | null {
    const existing = this.state.users[userId];
    if (!existing) return null;
    const user = { ...existing };
    mutate(user);
    this.state.users[userId] = user;
    return user;
  }

  private async mutateOrder(
    orderId: string,
    mutate: (order: Order) => void,
  ): Promise<Order> {
    await this.ensureLoaded();
    const order = this.replaceOrder(orderId, mutate);
    if (!order) throw new Error("Unknown order.");
    await this.persist();
    this.scheduleEmit(`order:${orderId}`, () => this.state.orders[orderId]);
    return order;
  }

  /** The single accept/decline status transition, shared by the public
   *  `orders.respond` and the bot auto-decision path. */
  private applyOrderResponse(order: Order, response: OrderResponse): void {
    if (order.status !== "pending") {
      throw new Error("Order is not awaiting a response.");
    }
    if (response.accept) {
      order.status = "accepted";
      order.acceptedAt = Date.now();
      if (response.etaMinutes !== undefined) order.etaMinutes = response.etaMinutes;
    } else {
      order.status = "declined";
      if (response.reason !== undefined) order.declineReason = response.reason;
    }
  }

  // ---- bot: order response simulation -----------------------------------

  /** Schedule a bot's accept/decline decision for an order after a random delay. */
  private scheduleBotDecision(orderId: string, seed: ScratcherSeed): void {
    this.track(() => {
      void this.runBotDecision(orderId, seed);
    }, this.randRange(this.botDecisionMinMs, this.botDecisionMaxMs));
  }

  private async runBotDecision(orderId: string, seed: ScratcherSeed): Promise<void> {
    await this.ensureLoaded();
    const order = this.state.orders[orderId];
    // Only act if the order is still awaiting a response (it may have been
    // cancelled). Re-read the CURRENT price — it may have been raised.
    if (!order || order.status !== "pending") return;
    const terms = {
      price: order.price,
      zone: order.zone,
      intensity: order.intensity,
      durationMinutes: order.durationMinutes,
    };
    if (shouldBotAccept(terms, seed, this.rng)) {
      const etaMinutes = pickEtaMinutes(this.rng);
      await this.mutateOrder(orderId, (o) =>
        this.applyOrderResponse(o, { accept: true, etaMinutes }),
      );
      this.scheduleBotChat(orderId, seed.id, buildScratcherChatLines(etaMinutes));
    } else {
      await this.mutateOrder(orderId, (o) =>
        this.applyOrderResponse(o, { accept: false, reason: pickDeclineReason(this.rng) }),
      );
    }
  }

  /** Send a bot's scripted chat lines one at a time, spaced by short delays. */
  private scheduleBotChat(orderId: string, senderId: string, lines: string[]): void {
    const sendNext = (index: number): void => {
      if (index >= lines.length) return;
      const order = this.state.orders[orderId];
      // Stop if the order left a chat-open state (e.g. cancelled).
      if (!order || order.status === "pending" || order.status === "declined" ||
        order.status === "cancelled") {
        return;
      }
      const text = lines[index];
      if (text !== undefined) {
        void this.appendMessage(orderId, senderId, text).catch(() => undefined);
      }
      this.track(
        () => sendNext(index + 1),
        this.randRange(this.botChatStepMinMs, this.botChatStepMaxMs),
      );
    };
    this.track(
      () => sendNext(0),
      this.randRange(this.botChatStepMinMs, this.botChatStepMaxMs),
    );
  }

  /** Append a chat message from `senderId` (a real user OR a bot) to an order's
   *  thread. Shared by the public `chat.send` and the bot chat scheduler. */
  private async appendMessage(
    orderId: string,
    senderId: string,
    text: string,
  ): Promise<ChatMessage> {
    await this.ensureLoaded();
    const order = this.state.orders[orderId];
    if (!order) throw new Error("Unknown order.");
    if (
      order.status === "pending" ||
      order.status === "declined" ||
      order.status === "cancelled"
    ) {
      throw new Error("Chat opens only once an order is accepted.");
    }
    const message: ChatMessage = {
      id: this.nextId("m"),
      orderId,
      senderId,
      text,
      createdAt: Date.now(),
    };
    // מערך חדש, לא push על הקיים במקום — אותה סיבה כמו replaceOrder/replaceUser.
    const existingThread = this.state.messages[orderId] ?? [];
    this.state.messages[orderId] = [...existingThread, message];
    await this.persist();
    this.scheduleEmit(`chat:${orderId}`, () => this.state.messages[orderId] ?? []);
    return message;
  }

  // ---- chat --------------------------------------------------------------

  readonly chat: ChatApi = {
    send: async (orderId: string, text: string) => {
      await this.ensureLoaded();
      const me = this.requireCurrentUser();
      return this.appendMessage(orderId, me.id, text);
    },

    list: async (orderId: string) => {
      await this.ensureLoaded();
      return this.state.messages[orderId] ?? [];
    },

    subscribe: (orderId: string, onMessage) => {
      const listener: Listener = (p) => onMessage(p as ChatMessage[]);
      return this.on(`chat:${orderId}`, listener);
    },
  };

  // ---- ratings -----------------------------------------------------------

  readonly ratings: RatingsApi = {
    submit: async (input) => {
      await this.ensureLoaded();
      const me = this.requireCurrentUser();
      const rating: Rating = {
        id: this.nextId("r"),
        orderId: input.orderId,
        raterId: me.id,
        rateeId: input.rateeId,
        raterRole: input.raterRole,
        stars: input.stars,
        ...(input.tag !== undefined ? { tag: input.tag } : {}),
        createdAt: Date.now(),
      };
      this.state.ratings.push(rating);

      // If the ratee is a real user, fold the score into their summary.
      // בונים ratings/summary חדשים — לא ממטבים מקוננים במקום (replaceUser
      // רק שוכפל את user ברמה השטוחה; ה-summary המקונן עדיין אותו reference
      // אם לא נבנה מפורשות).
      const rateeRole = oppositeRole(input.raterRole);
      this.replaceUser(input.rateeId, (u) => {
        const key = rateeRole === "scratcher" ? "asScratcher" : "asCustomer";
        const current = u.ratings[key];
        const nextCount = current.count + 1;
        const nextAverage =
          Math.round(((current.average * current.count + input.stars) / nextCount) * 100) / 100;
        u.ratings = { ...u.ratings, [key]: { average: nextAverage, count: nextCount } };
      });

      // Move a finished order into the "rated" state. Guarded up front so we
      // don't clone-and-emit a spurious no-op update for a non-completed order.
      if (this.state.orders[input.orderId]?.status === "completed") {
        const order = this.replaceOrder(input.orderId, (o) => {
          o.status = "rated";
        });
        if (order) this.scheduleEmit(`order:${order.id}`, () => this.state.orders[order.id]);
      }

      await this.persist();
      return rating;
    },

    listForUser: async (userId: string, role: RaterRole) => {
      await this.ensureLoaded();
      // `role` is the role the target user played; stored raterRole is the
      // counterparty's role, so we compare against its opposite.
      return this.state.ratings.filter(
        (r) => r.rateeId === userId && oppositeRole(r.raterRole) === role,
      );
    },
  };
}

/** Singleton used by the rest of the app. */
export const mockBackend = new MockBackend();
export default mockBackend;
