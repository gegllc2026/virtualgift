import { en, type MessageCatalog } from "./locales/en.js";
import { es } from "./locales/es.js";
import { fr } from "./locales/fr.js";
import { de } from "./locales/de.js";
import { pt } from "./locales/pt.js";
import { ar } from "./locales/ar.js";

export type { MessageCatalog };

export const locales = {
  en,
  es,
  fr,
  de,
  pt,
  ar,
} as const;

export type SupportedLocale = keyof typeof locales;

export const RTL_LOCALES: SupportedLocale[] = ["ar"];

export function isRtlLocale(locale: string): boolean {
  return (RTL_LOCALES as string[]).includes(locale);
}

export function t(
  locale: string,
  key: keyof MessageCatalog,
  vars?: Record<string, string | number>,
): string {
  const catalog = locales[locale as SupportedLocale] ?? locales.en;
  let message = catalog[key] ?? locales.en[key] ?? String(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      message = message.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return message;
}

export function listLocales(): SupportedLocale[] {
  return Object.keys(locales) as SupportedLocale[];
}
