// Pure bot decision + content logic for the mock backend.
//
// This file holds NO timers and NO MockBackend state: every function is a pure
// (given an injected `rng`) transformation from inputs to a decision, a value,
// or a block of scripted text. The live wiring — delays, emitters, persistence —
// lives in ./index.ts, which calls into here. Keeping the two apart makes the
// interesting behavior (accept/decline curve, rotation, scripted chat) unit
// testable without fake timers or a full backend instance.

import i18n from "@/i18n";

import type {
  BackZone,
  DurationMinutes,
  Intensity,
} from "../types";
import { SCRATCHER_SEEDS, type ScratcherSeed } from "./seed";

/** A random source in [0, 1). Injectable so tests can be deterministic. */
export type Rng = () => number;

/** The order facts a bot weighs when deciding whether to accept. */
export interface BotOrderTerms {
  price: number;
  zone: BackZone;
  intensity: Intensity;
  durationMinutes: DurationMinutes;
}

const DURATIONS: readonly DurationMinutes[] = [2, 5, 10];
const ZONES: readonly BackZone[] = [
  "upper",
  "lower",
  "betweenShoulders",
  "shoulders",
];
const INTENSITIES: readonly Intensity[] = ["gentle", "medium", "strong"];

const INTENSITY_MULTIPLIER: Record<Intensity, number> = {
  gentle: 0.9,
  medium: 1,
  strong: 1.15,
};

// Between-the-shoulders is the awkward-to-reach zone, so it commands a premium.
const ZONE_MULTIPLIER: Record<BackZone, number> = {
  upper: 1,
  lower: 1.05,
  betweenShoulders: 1.1,
  shoulders: 1,
};

/**
 * The "fair" reference price (ILS) for a zone/intensity/duration combo:
 *   base(duration) * intensityMultiplier * zoneMultiplier, where
 *   base = 10 + durationMinutes * 4  (₪18 / ₪30 / ₪50 for 2 / 5 / 10 min).
 */
export function fairPrice(
  terms: Pick<BotOrderTerms, "zone" | "intensity" | "durationMinutes">,
): number {
  const base = 10 + terms.durationMinutes * 4;
  return (
    base *
    INTENSITY_MULTIPLIER[terms.intensity] *
    ZONE_MULTIPLIER[terms.zone]
  );
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/**
 * Acceptance probability curve (baseline ~35% at a fair offer, per product
 * spec ~65% decline): p = clamp(0.35 + 0.5 * (price - fair) / fair, 0.05, 0.95).
 * At a fair price p≈0.35; doubling the offer pushes p≈0.85; halving it p≈0.10.
 * `seed` is accepted for signature completeness / future per-persona tuning.
 */
export function acceptanceProbability(
  terms: BotOrderTerms,
  _seed?: ScratcherSeed,
): number {
  const fair = fairPrice(terms);
  const p = 0.35 + 0.5 * ((terms.price - fair) / fair);
  return clamp(p, 0.05, 0.95);
}

/** Decide whether a bot accepts an order. Injects `rng` for deterministic tests. */
export function shouldBotAccept(
  terms: BotOrderTerms,
  seed: ScratcherSeed,
  rng: Rng = Math.random,
): boolean {
  return rng() < acceptanceProbability(terms, seed);
}

function pickFrom<T>(items: readonly T[], rng: Rng): T {
  // items is always non-empty at call sites below.
  const index = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[index] as T;
}

/** Random dry decline reason from the i18n `bot.asScratcher.declineReasons` array. */
export function pickDeclineReason(rng: Rng = Math.random): string {
  const reasons = i18n.t("bot.asScratcher.declineReasons", {
    returnObjects: true,
  }) as string[];
  return pickFrom(reasons, rng);
}

/** A believable ETA a bot offers on acceptance: 3–12 minutes. */
export function pickEtaMinutes(rng: Rng = Math.random): number {
  return 3 + Math.floor(rng() * 10);
}

/**
 * The scripted line sequence a bot-as-scratcher sends after accepting, in
 * order, with the real ETA interpolated into the opening line.
 */
export function buildScratcherChatLines(etaMinutes: number): string[] {
  return [
    i18n.t("bot.asScratcher.chat.onWay", { minutes: etaMinutes }),
    i18n.t("bot.asScratcher.chat.arrived"),
    i18n.t("bot.asScratcher.chat.starting"),
    i18n.t("bot.asScratcher.chat.checkIn"),
    i18n.t("bot.asScratcher.chat.finishing"),
    i18n.t("bot.asScratcher.chat.done"),
  ];
}

/**
 * The scripted line sequence a bot-as-customer sends after the real user
 * (in scratcher mode) accepts the bot's request.
 */
export function buildCustomerChatLines(): string[] {
  return [
    i18n.t("bot.asCustomer.chat.confirmed"),
    i18n.t("bot.asCustomer.chat.eta"),
    i18n.t("bot.asCustomer.chat.thanks"),
  ];
}

/**
 * Pick the next available-set for a pool of `poolSize` bots: a fresh random
 * subset whose size is between `min` and `max` (product spec: only 1–3 of the
 * ~25 bots available in the area at any moment, rotating over time). Returns a
 * boolean[] parallel to the pool. Pure — same rng ⇒ same result.
 */
export function nextAvailableFlags(
  poolSize: number,
  rng: Rng = Math.random,
  min = 1,
  max = 3,
): boolean[] {
  const flags = new Array<boolean>(poolSize).fill(false);
  if (poolSize <= 0) return flags;
  const span = Math.max(0, max - min);
  const count = Math.min(poolSize, min + Math.floor(rng() * (span + 1)));
  // Partial Fisher–Yates: shuffle just the first `count` slots into place.
  const order = Array.from({ length: poolSize }, (_v, i) => i);
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(rng() * (poolSize - i));
    const tmp = order[i] as number;
    order[i] = order[j] as number;
    order[j] = tmp;
  }
  for (let i = 0; i < count; i += 1) flags[order[i] as number] = true;
  return flags;
}

/** True when `id` belongs to a seed-pool bot (as opposed to a real user). */
export function isSeedBotId(id: string): boolean {
  return SCRATCHER_SEEDS.some((s) => s.id === id);
}

/** Plausible random order terms for a bot-originated request against a real user. */
export function buildBotCustomerOrderTerms(rng: Rng = Math.random): BotOrderTerms {
  const zone = pickFrom(ZONES, rng);
  const intensity = pickFrom(INTENSITIES, rng);
  const durationMinutes = pickFrom(DURATIONS, rng);
  const fair = fairPrice({ zone, intensity, durationMinutes });
  // Offer 0.9×–1.4× of fair, rounded to the nearest ₪5, so it reads naturally.
  const multiplier = 0.9 + rng() * 0.5;
  const price = Math.max(5, Math.round((fair * multiplier) / 5) * 5);
  return { zone, intensity, durationMinutes, price };
}
