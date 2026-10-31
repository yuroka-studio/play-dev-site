import "./globals.css";
import type { Viewport } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NotFoundView } from "@/components/NotFoundView";
import { RootDocument } from "@/components/RootDocument";
import { defaultLocale, site } from "@/lib/config";
import { withStudio } from "@/lib/metadata";

// out/404.html: the default-language 404 for URLs outside /{locale}/ (and the
// page GitHub Pages and Cloudflare Pages show for every unknown URL).
// Next adds <meta name="robots" content="noindex"> to not-found documents itself.
export async function generateMetadata() {
  const t = await getTranslations({ locale: defaultLocale, namespace: "notFound" });
  return { title: withStudio(t("title")) };
}
export const viewport: Viewport = { themeColor: site.accentColor, colorScheme: "light" };

export default async function RootNotFound() {
  setRequestLocale(defaultLocale);
  return (
    <RootDocument locale={defaultLocale}>
      <NotFoundView locale={defaultLocale} />
    </RootDocument>
  );
}
