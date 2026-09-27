import en from "@/dictionaries/en.json";
import ar from "@/dictionaries/ar.json";

const dictionaries = { en, ar };

export type Locale = keyof typeof dictionaries;
export const locales: Locale[] = ["ar", "en"];
export const defaultLocale: Locale = "ar";

export function isLocale(value: string): value is Locale {
  return (locales as string[]).includes(value);
}

export function getDictionary(locale: string): typeof en {
  return dictionaries[isLocale(locale) ? locale : defaultLocale];
}

export type Dictionary = ReturnType<typeof getDictionary>;

// Tiny {placeholder} interpolator — avoids pulling in a full i18n library
// for an MVP with a handful of dynamic strings.
export function format(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
