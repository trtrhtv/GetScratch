import type { BackZone, Intensity } from "@/backend/types";

// מיפוי מפתחות i18n משותף — נמנע משכפול הפריטים בין ContourBackMap,
// ScratcherListRow, ומסך יצירת ההזמנה.
export const ZONE_LABEL_KEYS = {
  upper: "order.create.zones.upper",
  lower: "order.create.zones.lower",
  betweenShoulders: "order.create.zones.betweenShoulders",
  shoulders: "order.create.zones.shoulders",
} as const satisfies Record<BackZone, string>;

export const INTENSITY_LABEL_KEYS = {
  gentle: "order.create.intensity.gentle",
  medium: "order.create.intensity.medium",
  strong: "order.create.intensity.strong",
} as const satisfies Record<Intensity, string>;
