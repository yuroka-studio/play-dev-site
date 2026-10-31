import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

type Messages = Record<string, unknown>;

/** Deep merge so a partly translated messages file falls back to the default language. */
function merge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = out[key];
    out[key] =
      value && typeof value === "object" && !Array.isArray(value) && current && typeof current === "object" && !Array.isArray(current)
        ? merge(current as Messages, value as Messages)
        : value;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale, locale: explicit }) => {
  const requested = explicit ?? (await requestLocale);
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const fallback = (await import(`../messages/${routing.defaultLocale}.json`)).default as Messages;
  const own = locale === routing.defaultLocale ? {} : ((await import(`../messages/${locale}.json`)).default as Messages);
  return {
    locale,
    // Timestamps are never shown, only plain dates, so UTC keeps builds identical everywhere.
    timeZone: "UTC",
    messages: merge(fallback, own),
  };
});
