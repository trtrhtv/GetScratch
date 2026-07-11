import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import he from "./locales/he.json";
import en from "./locales/en.json";

export type SupportedLanguage = "he" | "en";

const RTL_LANGUAGES: readonly SupportedLanguage[] = ["he"];

export const resources = {
  he: { translation: he },
  en: { translation: en },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: "he",
  fallbackLng: "he",
  compatibilityJSON: "v4",
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export function isRTLLanguage(lang: SupportedLanguage): boolean {
  return RTL_LANGUAGES.includes(lang);
}

export default i18n;
