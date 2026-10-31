// The validated site config plus the lookups the pages need.
// Import from here, not from site.config.ts, so a bad config fails the build early.
import config, { locales, type Locale } from "../site.config";
import { assertValidConfig } from "./validate-config";
import type { AppConfig } from "./types";

assertValidConfig(config);

export type { Locale };
export { locales };
export type App = AppConfig<Locale>;

export const site = config;
export const defaultLocale: Locale = config.defaultLocale;
export const apps: readonly App[] = config.apps;

/** Locales that have the full policy text. Others link to the default-language policy pages. */
export const legalLocales: readonly Locale[] = config.legalLocales ?? config.locales;

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function hasLegal(locale: Locale): boolean {
  return legalLocales.includes(locale);
}

/** The locale whose policy text a visitor in `locale` is shown. */
export function legalLocaleFor(locale: Locale): Locale {
  return hasLegal(locale) ? locale : defaultLocale;
}

export function findApp(id: string): App | undefined {
  return apps.find((a) => a.id === id);
}

export function hasAccount(app: App): boolean {
  return app.practices.hasAccount;
}

export const appsWithAccounts: readonly App[] = apps.filter(hasAccount);

/** App id of the one throw-away page generated when a route would otherwise have no pages (see `nonEmpty`). */
export const PLACEHOLDER_APP = "_unused";

/**
 * Next.js refuses an empty generateStaticParams() with output "export", which
 * happens for the delete-account route when no app has accounts (or for the
 * privacy route when there are no apps). In that case one placeholder page is
 * generated instead: it renders the 404 view, and scripts/postbuild.mjs deletes it.
 */
export function nonEmpty(params: { locale: Locale; app: string }[]): { locale: Locale; app: string }[] {
  return params.length > 0 ? params : [{ locale: defaultLocale, app: PLACEHOLDER_APP }];
}

/** Route builders; one place for every internal URL. */
export const paths = {
  home: (l: Locale) => `/${l}`,
  privacy: (l: Locale) => `/${l}/privacy`,
  appPrivacy: (l: Locale, appId: string) => `/${l}/apps/${appId}/privacy`,
  appDelete: (l: Locale, appId: string) => `/${l}/apps/${appId}/delete-account`,
};

/** Absolute URL for a path, for canonical links, the sitemap and the policy text. */
export function absoluteUrl(path: string): string {
  return `${config.websiteUrl}${path}`;
}
