// Static seed DATA for the mock backend. Pure data only — no timers, no
// call-time randomness, no accept/decline simulation. A future bot-behavior
// layer will import this pool and animate it.

import type { AvatarId, BackZone, Intensity } from "../types";

export interface ScratcherSeed {
  id: string;
  name: string;
  avatarId: AvatarId;
  /** Baseline rating average, 4.6–4.99. */
  baseRating: number;
  /** Lifetime completed scratches, 40–2200. */
  completedCount: number;
  specialtyZone: BackZone;
  specialtyIntensity: Intensity;
}

/**
 * ~25 realistic Israeli personas (first name + last initial).
 * These become the "nearby people" pool. isBot is applied by the mock
 * backend, not stored here — nothing in this file marks them as bots.
 */
export const SCRATCHER_SEEDS: readonly ScratcherSeed[] = [
  { id: "s01", name: "דני ל.", avatarId: "a1", baseRating: 4.92, completedCount: 1840, specialtyZone: "upper", specialtyIntensity: "strong" },
  { id: "s02", name: "קרן ב.", avatarId: "a2", baseRating: 4.99, completedCount: 2210, specialtyZone: "shoulders", specialtyIntensity: "medium" },
  { id: "s03", name: "מוטי ש.", avatarId: "a3", baseRating: 4.71, completedCount: 312, specialtyZone: "lower", specialtyIntensity: "strong" },
  { id: "s04", name: "אורית ד.", avatarId: "a4", baseRating: 4.88, completedCount: 940, specialtyZone: "betweenShoulders", specialtyIntensity: "gentle" },
  { id: "s05", name: "יוסי כ.", avatarId: "a5", baseRating: 4.63, completedCount: 78, specialtyZone: "upper", specialtyIntensity: "medium" },
  { id: "s06", name: "נעמה פ.", avatarId: "a6", baseRating: 4.95, completedCount: 1520, specialtyZone: "shoulders", specialtyIntensity: "gentle" },
  { id: "s07", name: "איתי ר.", avatarId: "a7", baseRating: 4.79, completedCount: 604, specialtyZone: "lower", specialtyIntensity: "medium" },
  { id: "s08", name: "שירה מ.", avatarId: "a8", baseRating: 4.97, completedCount: 1980, specialtyZone: "betweenShoulders", specialtyIntensity: "strong" },
  { id: "s09", name: "גיל ט.", avatarId: "a1", baseRating: 4.68, completedCount: 145, specialtyZone: "upper", specialtyIntensity: "gentle" },
  { id: "s10", name: "רונית ע.", avatarId: "a2", baseRating: 4.9, completedCount: 1105, specialtyZone: "shoulders", specialtyIntensity: "strong" },
  { id: "s11", name: "עמית ח.", avatarId: "a3", baseRating: 4.74, completedCount: 268, specialtyZone: "lower", specialtyIntensity: "gentle" },
  { id: "s12", name: "טל נ.", avatarId: "a4", baseRating: 4.86, completedCount: 812, specialtyZone: "betweenShoulders", specialtyIntensity: "medium" },
  { id: "s13", name: "ליאור ז.", avatarId: "a5", baseRating: 4.66, completedCount: 96, specialtyZone: "upper", specialtyIntensity: "strong" },
  { id: "s14", name: "מיכל ג.", avatarId: "a6", baseRating: 4.93, completedCount: 1425, specialtyZone: "shoulders", specialtyIntensity: "medium" },
  { id: "s15", name: "אבי ס.", avatarId: "a7", baseRating: 4.77, completedCount: 530, specialtyZone: "lower", specialtyIntensity: "strong" },
  { id: "s16", name: "הדס א.", avatarId: "a8", baseRating: 4.98, completedCount: 2040, specialtyZone: "betweenShoulders", specialtyIntensity: "gentle" },
  { id: "s17", name: "עומר ק.", avatarId: "a1", baseRating: 4.61, completedCount: 52, specialtyZone: "upper", specialtyIntensity: "medium" },
  { id: "s18", name: "יעל ו.", avatarId: "a2", baseRating: 4.89, completedCount: 987, specialtyZone: "shoulders", specialtyIntensity: "gentle" },
  { id: "s19", name: "רם ה.", avatarId: "a3", baseRating: 4.72, completedCount: 224, specialtyZone: "lower", specialtyIntensity: "medium" },
  { id: "s20", name: "דנה צ.", avatarId: "a4", baseRating: 4.94, completedCount: 1660, specialtyZone: "betweenShoulders", specialtyIntensity: "strong" },
  { id: "s21", name: "ניר ב.", avatarId: "a5", baseRating: 4.65, completedCount: 118, specialtyZone: "upper", specialtyIntensity: "gentle" },
  { id: "s22", name: "ספיר ל.", avatarId: "a6", baseRating: 4.91, completedCount: 1290, specialtyZone: "shoulders", specialtyIntensity: "strong" },
  { id: "s23", name: "אלון מ.", avatarId: "a7", baseRating: 4.78, completedCount: 470, specialtyZone: "lower", specialtyIntensity: "gentle" },
  { id: "s24", name: "מור ד.", avatarId: "a8", baseRating: 4.96, completedCount: 1755, specialtyZone: "betweenShoulders", specialtyIntensity: "medium" },
  { id: "s25", name: "בר ש.", avatarId: "a1", baseRating: 4.7, completedCount: 190, specialtyZone: "upper", specialtyIntensity: "strong" },
];
