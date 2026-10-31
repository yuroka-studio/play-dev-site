import type { Metadata } from "next";
import { absoluteUrl, defaultLocale, site, type Locale } from "./config";

/** "Page title | Studio name"; the home page uses its own full title. */
export function withStudio(title: string): string {
  return `${title} | ${site.studioName}`;
}

/**
 * Metadata shared by every page: canonical URL, hreflang alternates for the
 * languages this page exists in, Open Graph and a plain summary card.
 * `pathFor` builds the page's path in a given language.
 */
export function pageMetadata(opts: {
  locale: Locale;
  pathFor: (locale: Locale) => string;
  /** Languages this page exists in (default: just this one). */
  available?: readonly Locale[];
  title: string;
  description: string;
  noindex?: boolean;
}): Metadata {
  const { locale, pathFor, available = [locale], title, description, noindex } = opts;
  const languages: Record<string, string> = Object.fromEntries(available.map((l) => [l, pathFor(l)]));
  if (available.includes(defaultLocale)) languages["x-default"] = pathFor(defaultLocale);
  return {
    metadataBase: new URL(site.websiteUrl),
    title,
    description,
    applicationName: site.studioName,
    icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
    alternates: noindex ? undefined : { canonical: pathFor(locale), languages },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: site.studioName,
      url: noindex ? undefined : absoluteUrl(pathFor(locale)),
      title,
      description,
    },
    twitter: { card: "summary", title, description },
    formatDetection: { email: false, telephone: false, address: false },
  };
}
