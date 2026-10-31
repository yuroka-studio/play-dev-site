import type { MetadataRoute } from "next";
import { absoluteUrl, appsWithAccounts, apps, defaultLocale, legalLocales, locales, paths, site, type Locale } from "@/lib/config";

export const dynamic = "force-static";

type Page = { path: (l: Locale) => string; available: readonly Locale[]; priority: number };

// Every generated page and the languages it exists in.
const PAGES: Page[] = [
  { path: paths.home, available: locales, priority: 1 },
  { path: paths.privacy, available: legalLocales, priority: 0.4 },
  ...apps.map((a) => ({ path: (l: Locale) => paths.appPrivacy(l, a.id), available: legalLocales, priority: 0.6 })),
  ...appsWithAccounts.map((a) => ({ path: (l: Locale) => paths.appDelete(l, a.id), available: legalLocales, priority: 0.5 })),
];

export default function sitemap(): MetadataRoute.Sitemap {
  // A fixed date from the config keeps the build reproducible.
  const lastModified = new Date(`${site.policyLastUpdated}T00:00:00Z`);
  return PAGES.flatMap((page) =>
    page.available.map((l) => ({
      url: absoluteUrl(page.path(l)),
      lastModified,
      priority: page.priority,
      alternates: {
        languages: {
          ...Object.fromEntries(page.available.map((x) => [x, absoluteUrl(page.path(x))])),
          ...(page.available.includes(defaultLocale) ? { "x-default": absoluteUrl(page.path(defaultLocale)) } : {}),
        },
      },
    })),
  );
}
