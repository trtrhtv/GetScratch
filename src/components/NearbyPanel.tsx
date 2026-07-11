// קובץ-גישור לטיפוסים בלבד. Metro תמיד מעדיף את NearbyPanel.native.tsx /
// NearbyPanel.web.tsx על פני הקובץ הזה בזמן ה-bundle (מוסכמת פלטפורמות
// סטנדרטית) — הוא קיים אך ורק כדי ש-TypeScript (שלא מכיר את המוסכמה הזו)
// ידע לפתור את הייבוא חסר-הסיומת ולבדוק טיפוסים נכונים.
export { default } from "./NearbyPanel.native";
