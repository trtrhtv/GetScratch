// טוקני עיצוב — מקור האמת היחיד לצבע/טיפוגרפיה/ריווח. ראו DESIGN.md לנימוקים.
// אין ערכים אד-הוק ברכיבים: כל גודל/צבע/ריווח מגיע מכאן.

export const color = {
  paper: "#F4F6F7", // רקע האפליקציה
  ink: "#12181D", // טקסט ראשי
  inkMuted: "rgba(18, 24, 29, 0.62)", // טקסט משני
  inkFaint: "rgba(18, 24, 29, 0.38)", // disabled / placeholder
  hairline: "rgba(18, 24, 29, 0.12)", // גבולות עדינים
  surface: "#FFFFFF", // כרטיסים / bottom sheet
  slate: "#0F5E56", // מותג ראשי — accent/selected/available
  slateSoft: "#E4EFEC", // רקע עדין לגוון slate (badges, tints)
  amber: "#E8892C", // CTA יחיד ודומיננטי
  amberSoft: "#FBEBD8",
  sage: "#3E9C79", // סטטוס חיובי
  sageSoft: "#E4F3EC",
  brick: "#C1483A", // סטטוס שלילי / דחייה
  brickSoft: "#F8E6E3",
  white: "#FFFFFF",
} as const;

export const font = {
  display: "SuezOne_400Regular", // כותרות, מחיר, wordmark — בלבד
  bodyRegular: "Assistant_400Regular",
  bodyMedium: "Assistant_500Medium",
  bodySemiBold: "Assistant_600SemiBold",
  bodyBold: "Assistant_700Bold",
} as const;

export const fontSize = {
  caption: 12,
  label: 13,
  body: 15,
  bodyLarge: 17,
  button: 16,
  title: 22,
  hero: 28,
  priceNumeral: 40,
} as const;

export const lineHeight = {
  caption: 16,
  label: 18,
  body: 22,
  bodyLarge: 24,
  button: 20,
  title: 28,
  hero: 34,
  priceNumeral: 44,
} as const;

// סקאלת ריווח יחידה — כל margin/padding ברכיבים נגזר מכאן.
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const theme = {
  color,
  font,
  fontSize,
  lineHeight,
  space,
  radius,
} as const;

export type Theme = typeof theme;
