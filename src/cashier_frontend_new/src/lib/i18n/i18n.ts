import en from "./locales/en.json";

export type Locale = "en";
export type TranslationKey = string;

export const locales: Locale[] = ["en"];
export const defaultLocale: Locale = "en";

// Type-safe translations structure
export type Translations = typeof en;

// Load translations for a specific locale
export function loadTranslations(locale: Locale): Translations {
  switch (locale) {
    case "en":
      return en;
    default:
      return en;
  }
}

// Get nested translation value by key path
export function getTranslation(
  translations: Translations,
  key: string,
): string | undefined {
  const keys = key.split(".");
  let value: unknown = translations;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }

  return typeof value === "string" ? value : undefined;
}

