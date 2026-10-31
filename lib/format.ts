// Locale-aware formatting helpers. No locale tables to maintain: Intl does the work.
import type { Locale } from "./config";

/** "A, B and C" in the reader's language. */
export function listFormat(locale: Locale, items: readonly string[]): string {
  return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
}

/** "November 1, 2026" for an ISO date; UTC so the result never depends on the build machine. */
export function dateFormat(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

/** The language's own name for itself ("English", "Türkçe"), first letter capitalised. */
export function languageName(code: string, inLocale: string = code): string {
  const name = new Intl.DisplayNames([inLocale], { type: "language" }).of(code) ?? code;
  return name.charAt(0).toLocaleUpperCase(inLocale) + name.slice(1);
}

/** Whole years when the number of days is a multiple of 365 (7 years), otherwise days. */
export function periodFormat(days: number, t: (key: "days" | "years", values: { count: number }) => string): string {
  return days >= 365 && days % 365 === 0 ? t("years", { count: days / 365 }) : t("days", { count: days });
}
