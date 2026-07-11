// קובץ-גישור לטיפוסים בלבד — ראו NearbyPanel.tsx להסבר המלא של המוסכמה.
// Metro תמיד מעדיף את RadarPulse.native.tsx / RadarPulse.web.tsx על פני
// הקובץ הזה בזמן ה-bundle; זה קיים רק כדי ש-TypeScript יפתור את הייבוא
// חסר-הסיומת בלי moduleSuffixes (ראה phase-5 PROGRESS.md — moduleSuffixes
// שבר את פתרון הטיפוסים של lucide-react-native).
export { default } from "./RadarPulse.native";
