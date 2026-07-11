// The BackendAdapter interface — the single seam between the app and any
// backend implementation. MockBackend implements it today; a future
// SupabaseBackend will implement the exact same interface.
//
// Design rules for this file:
//  - Every method is async (returns a Promise) so implementations are free
//    to be network-bound.
//  - No platform details leak in: no AsyncStorage, no timers, no realtime
//    library types. Realtime is expressed purely as subscribe(cb) -> Unsubscribe.

import type {
  AvatarId,
  ChatMessage,
  DurationMinutes,
  GeoPoint,
  Intensity,
  Order,
  Rating,
  RaterRole,
  ScratcherProfile,
  BackZone,
  Unsubscribe,
  User,
} from "./types";

/** Input for creating a new order. */
export interface CreateOrderInput {
  scratcherId: string;
  zone: BackZone;
  intensity: Intensity;
  durationMinutes: DurationMinutes;
  /** Offered price in ILS. */
  price: number;
}

/** How the receiving party responds to an incoming order. */
export interface OrderResponse {
  accept: boolean;
  /** Optional reason, meaningful when declining. */
  reason?: string;
  /** Optional ETA the scratcher offers when accepting. */
  etaMinutes?: number;
}

/** Persisted flags controlling whether onboarding/terms are shown again. */
export interface OnboardingState {
  onboardingCompleted: boolean;
  termsAccepted: boolean;
}

/** 1. Authentication & account. Mock phone only — never real SMS. */
export interface AuthApi {
  /** Begin sign up with a name + mock phone. Sends a (fake) code. */
  signUp(name: string, phone: string): Promise<{ userId: string }>;
  /** Verify with the fixed demo code "000000". Resolves the signed-in user. */
  verifyCode(userId: string, code: string): Promise<User>;
  /** The currently signed-in user, or null if none. */
  getCurrentUser(): Promise<User | null>;
  /** Update the signed-in user's preset avatar. */
  updateAvatar(avatarId: AvatarId): Promise<User>;
  /** Read persisted onboarding/terms flags. */
  getOnboardingState(): Promise<OnboardingState>;
  /** Persist onboarding/terms flags (partial update). */
  setOnboardingState(patch: Partial<OnboardingState>): Promise<OnboardingState>;
}

/** 2. Presence & discovery. */
export interface PresenceApi {
  /** Toggle the signed-in user's own availability. */
  setAvailability(isAvailable: boolean): Promise<User>;
  /** Nearby scratcher profiles around an origin point. */
  listNearby(origin: GeoPoint): Promise<ScratcherProfile[]>;
  /**
   * Subscribe to live changes of the nearby set around an origin.
   * The callback fires with the current list whenever it changes.
   * Returns an unsubscribe function.
   */
  subscribeNearby(
    origin: GeoPoint,
    onChange: (profiles: ScratcherProfile[]) => void,
  ): Unsubscribe;
}

/** 3. Orders. */
export interface OrdersApi {
  create(input: CreateOrderInput): Promise<Order>;
  /** Raise the offered price on a pending order. */
  raisePrice(orderId: string, newPrice: number): Promise<Order>;
  /** Respond as the receiving party (accept/decline with optional reason). */
  respond(orderId: string, response: OrderResponse): Promise<Order>;
  /** Mark an accepted/in-progress order complete. */
  markComplete(orderId: string): Promise<Order>;
  cancel(orderId: string, reason?: string): Promise<Order>;
  getById(orderId: string): Promise<Order | null>;
  /** Live updates for a single order. */
  subscribeOrder(
    orderId: string,
    onChange: (order: Order) => void,
  ): Unsubscribe;
  /** Pending requests where I am the scratcher (scratcher-mode inbox). */
  listIncoming(): Promise<Order[]>;
  /** My full order history across both roles. */
  listHistory(): Promise<Order[]>;
}

/** 4. Chat — only valid once an order reached "accepted". */
export interface ChatApi {
  send(orderId: string, text: string): Promise<ChatMessage>;
  list(orderId: string): Promise<ChatMessage[]>;
  subscribe(
    orderId: string,
    onMessage: (messages: ChatMessage[]) => void,
  ): Unsubscribe;
}

/** 5. Ratings. */
export interface RatingsApi {
  submit(input: {
    orderId: string;
    rateeId: string;
    raterRole: RaterRole;
    stars: number;
    tag?: string;
  }): Promise<Rating>;
  /** Ratings for a user, filtered by the role that user played. */
  listForUser(userId: string, role: RaterRole): Promise<Rating[]>;
}

/** The full backend surface the app depends on. */
export interface BackendAdapter {
  auth: AuthApi;
  presence: PresenceApi;
  orders: OrdersApi;
  chat: ChatApi;
  ratings: RatingsApi;
}
