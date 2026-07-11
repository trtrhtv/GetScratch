// Shared domain types for the Gardan backend.
//
// These types are the contract between the app and any BackendAdapter
// implementation (mock today, Supabase later). They are deliberately
// platform-agnostic: no timers, no storage handles, no realtime-lib types.

/** Preset avatar identifier ("a1".."a8"). The UI renders these as flat
 *  colored initials/icon tiles — this is NOT a photo URL. */
export type AvatarId =
  | "a1"
  | "a2"
  | "a3"
  | "a4"
  | "a5"
  | "a6"
  | "a7"
  | "a8";

/** A mock geographic point. Never wired to real device GPS in the mock. */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Average + count summary for a single role. */
export interface RatingSummary {
  average: number;
  count: number;
}

/** A user's rating standing split by the two roles every user can play. */
export interface UserRatings {
  asCustomer: RatingSummary;
  asScratcher: RatingSummary;
}

/**
 * A Gardan account. Every user is BOTH a customer and a scratcher —
 * there is no separate scratcher account type. `isAvailable` is the single
 * toggle that opts the user into being discoverable/bookable as a scratcher.
 */
export interface User {
  id: string;
  name: string;
  /** Mock phone number. Never used for real SMS. */
  phone: string;
  avatarId: AvatarId;
  createdAt: number;
  /** The one "available to scratch" toggle. */
  isAvailable: boolean;
  /** Mock location; null until the user shares/sets one. */
  location: GeoPoint | null;
  ratings: UserRatings;
}

export type BackZone = "upper" | "lower" | "betweenShoulders" | "shoulders";

export type Intensity = "gentle" | "medium" | "strong";

export type DurationMinutes = 2 | 5 | 10;

export type OrderStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "in_progress"
  | "completed"
  | "rated"
  | "cancelled";

/** A scratcher's declared specialty. */
export interface Specialty {
  zone: BackZone;
  intensity: Intensity;
}

/**
 * The public card for a nearby person shown on the map/list.
 *
 * `isBot` is an INTERNAL flag only. It is never surfaced through any
 * UI-facing method name or response shape in a way that lets the rest of
 * the app single out a bot: bots must be indistinguishable from real users
 * by API shape alone. Consumers should treat this field as opaque.
 */
export interface ScratcherProfile {
  id: string;
  name: string;
  avatarId: AvatarId;
  rating: RatingSummary;
  completedCount: number;
  specialty: Specialty;
  distanceKm: number;
  location: GeoPoint;
  isAvailable: boolean;
  /** Internal only — do not expose in UI. */
  isBot: boolean;
}

export interface Order {
  id: string;
  customerId: string;
  scratcherId: string;
  zone: BackZone;
  intensity: Intensity;
  durationMinutes: DurationMinutes;
  /** Offered price in ILS. */
  price: number;
  status: OrderStatus;
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  declineReason?: string;
  etaMinutes?: number;
}

/** A chat message. Chat only exists for an order that reached "accepted". */
export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  text: string;
  createdAt: number;
}

/** Which role the rater played in the order being rated. */
export type RaterRole = "customer" | "scratcher";

export interface Rating {
  id: string;
  orderId: string;
  raterId: string;
  rateeId: string;
  raterRole: RaterRole;
  /** 1–5. */
  stars: number;
  tag?: string;
  createdAt: number;
}

/** Unsubscribe handle returned by every subscribe* method. */
export type Unsubscribe = () => void;
