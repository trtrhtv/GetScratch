import type { GeoPoint } from "@/backend/types";

// מיקום-דמה קבוע (מרכז תל אביב בקירוב) — תואם למרכז שממנו MockBackend
// ממקם את פרופילי הבוטים, כדי שהמרחקים המחושבים יהיו קטנים והגיוניים.
// אין חיבור ל-GPS אמיתי בשלב זה.
export const MOCK_MY_LOCATION: GeoPoint = { lat: 32.0809, lng: 34.7806 };
