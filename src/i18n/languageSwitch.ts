import { DevSettings, I18nManager, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n, { isRTLLanguage, type SupportedLanguage } from "./index";

const LANGUAGE_STORAGE_KEY = "gardan.language";

export async function loadPersistedLanguage(): Promise<SupportedLanguage> {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === "en" || stored === "he" ? stored : "he";
}

// קריאה פר-אתחול בלבד: מיישר את i18next ואת דגלי הכיוון למצב השמור, בלי
// רענון. ה-root layout שומר ready=false עד שזה מסתיים, כך שאין עדיין עץ
// views מותקן שצריך להתהפך — הכיוון הנכון פשוט חל על הרינדור הראשון.
export async function initLanguageAtBoot(): Promise<SupportedLanguage> {
  const lang = await loadPersistedLanguage();
  await i18n.changeLanguage(lang);
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(isRTLLanguage(lang));
  return lang;
}

// קריאה אינטראקטיבית: המשתמש מחליף שפה תוך כדי שימוש, כשעץ ה-UI כבר
// מותקן בכיוון הקודם. React Native לא מהפך כיוון של views קיימים בלי
// רענון של ה-JS root — מגבלה ידועה של הפלטפורמה.
export async function applyLanguage(lang: SupportedLanguage): Promise<void> {
  const nextIsRTL = isRTLLanguage(lang);
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(nextIsRTL);
  reloadApp();
}

function reloadApp(): void {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.location.reload();
    return;
  }
  try {
    DevSettings.reload();
  } catch {
    // build production עצמאי בלי dev client — אין מנגנון רענון תוכנתי;
    // הכיוון ייכנס לתוקף באתחול הבא של האפליקציה.
  }
}
