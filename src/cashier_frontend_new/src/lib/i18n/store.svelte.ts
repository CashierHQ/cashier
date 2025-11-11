import { loadTranslations, type Locale, type Translations } from "./i18n";

// Current locale state
let currentLocale = $state<Locale>("en");

// Current translations
let translations = $state<Translations>(loadTranslations("en"));

// Set locale and load translations
export function setLocale(locale: Locale) {
  currentLocale = locale;
  translations = loadTranslations(locale);
  
  // Save to localStorage for persistence
  if (typeof window !== "undefined") {
    localStorage.setItem("locale", locale);
  }
}

// Initialize locale from localStorage or use default
export function initLocale() {
  if (typeof window !== "undefined") {
    const savedLocale = localStorage.getItem("locale") as Locale | null;
    if (savedLocale && savedLocale === "en") {
      setLocale(savedLocale);
    } else {
      // Use default locale (English)
      setLocale("en");
    }
  }
}

// Get translation by key path (e.g., "home.header.login")
export function t(key: string): string {
  const keys = key.split(".");
  let value: unknown = translations;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }

  return typeof value === "string" ? value : key;
}

// Export reactive state
export const locale = {
  get current() {
    return currentLocale;
  },
  get translations() {
    return translations;
  },
  set: setLocale,
  init: initLocale,
  t,
};

