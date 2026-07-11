// MockBackend — an in-memory implementation of BackendAdapter used for
// development and demos. State lives in memory (source of truth) and is
// mirrored to AsyncStorage so it survives an app reload.
//
// Realtime is *simulated*: subscribe* methods register against a tiny internal
// event emitter, and mutations notify subscribers after a random delay so the
// mock feels like it is talking to a real backend. The delay is injectable so
// tests can run fast.
//
// INTENTIONALLY INERT (pending the future bot-behavior layer): scratcher
// profiles from the seed pool are bots that never auto accept/decline orders
// and never send chat messages — an order created against a seed scratcher
// simply stays "pending", and `listIncoming` stays empty for a real user
// because bots do not originate requests. That behavioral layer is separate.

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
import { SCRATCHER_SEEDS, type ScratcherSeed } from "./seed";

const STORAGE_KEY = "@gardan/mock/v1";
const DEMO_VERIFY_CODE = "000000";
const DEFAULT_MIN_DELAY_MS = 1500;
const DEFAULT_MAX_DELAY_MS = 8000;

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

  private state: PersistedState = emptyState();
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly bots: BotState[];
  private idCounter = 0;
  private loadPromise: Promise<void> | null = null;

  constructor(options: MockBackendOptions = {}) {
    this.minDelayMs = options.minDelayMs ?? DEFAULT_MIN_DELAY_MS;
    this.maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    this.storage = options.storage ?? AsyncStorage;
    // Bots are derived from the static seed pool at construction; they are not
    // persisted (they are regenerated deterministically every run).
    this.bots = SCRATCHER_SEEDS.map((seed, i) => ({
      seed,
      location: {
        lat: SEED_CENTER.lat + (((i % 5) - 2) * 0.006),
        lng: SEED_CENTER.lng + ((Math.floor(i / 5) - 2) * 0.006),
      },
      isAvailable: true,
    }));
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
    const id = this.state.currentUserId;
    const user = id ? this.state.users[id] : undefined;
    if (!user) throw new Error("No current user. Sign up and verify first.");
    return user;
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
      const user = this.requireCurrentUser();
      user.avatarId = avatarId;
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
      const user = this.requireCurrentUser();
      user.isAvailable = isAvailable;
      await this.persist();
      return user;
    },

    listNearby: async (origin: GeoPoint) => {
      await this.ensureLoaded();
      return this.nearbyProfiles(origin);
    },

    subscribeNearby: (origin: GeoPoint, onChange) => {
      const listener: Listener = (p) => onChange(p as ScratcherProfile[]);
      const unsubscribe = this.on("nearby", listener);
      // Emit an initial snapshot to THIS subscriber only (not the whole
      // channel) after a backend-like delay — otherwise every new subscriber
      // would also re-notify every other already-subscribed listener.
      const timer = setTimeout(() => onChange(this.nearbyProfiles(origin)), this.randomDelay());
      return () => {
        clearTimeout(timer);
        unsubscribe();
      };
    },
  };

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
      const order = await this.mutateOrder(orderId, (o) => {
        if (o.status !== "pending") {
          throw new Error("Order is not awaiting a response.");
        }
        if (response.accept) {
          o.status = "accepted";
          o.acceptedAt = Date.now();
          if (response.etaMinutes !== undefined) o.etaMinutes = response.etaMinutes;
        } else {
          o.status = "declined";
          if (response.reason !== undefined) o.declineReason = response.reason;
        }
      });
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

  private async mutateOrder(
    orderId: string,
    mutate: (order: Order) => void,
  ): Promise<Order> {
    await this.ensureLoaded();
    const order = this.state.orders[orderId];
    if (!order) throw new Error("Unknown order.");
    mutate(order);
    await this.persist();
    this.scheduleEmit(`order:${orderId}`, () => this.state.orders[orderId]);
    return order;
  }

  // ---- chat --------------------------------------------------------------

  readonly chat: ChatApi = {
    send: async (orderId: string, text: string) => {
      await this.ensureLoaded();
      const me = this.requireCurrentUser();
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
        senderId: me.id,
        text,
        createdAt: Date.now(),
      };
      const thread = this.state.messages[orderId] ?? [];
      thread.push(message);
      this.state.messages[orderId] = thread;
      await this.persist();
      this.scheduleEmit(`chat:${orderId}`, () => this.state.messages[orderId] ?? []);
      return message;
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
      const ratee = this.state.users[input.rateeId];
      if (ratee) {
        const rateeRole = oppositeRole(input.raterRole);
        const summary =
          rateeRole === "scratcher"
            ? ratee.ratings.asScratcher
            : ratee.ratings.asCustomer;
        const total = summary.average * summary.count + input.stars;
        summary.count += 1;
        summary.average = Math.round((total / summary.count) * 100) / 100;
      }

      // Move a finished order into the "rated" state.
      const order = this.state.orders[input.orderId];
      if (order && order.status === "completed") {
        order.status = "rated";
        this.scheduleEmit(`order:${order.id}`, () => this.state.orders[order.id]);
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
