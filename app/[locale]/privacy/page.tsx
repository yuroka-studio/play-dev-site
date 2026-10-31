import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Doc } from "@/components/Doc";
import { PageShell } from "@/components/PageShell";
import { hasLegal, legalLocales, locales, paths, type Locale } from "@/lib/config";
import { pageMetadata, withStudio } from "@/lib/metadata";
import { buildWebsitePolicy } from "@/lib/website-policy";

// The website's own privacy policy. Only for languages that have policy text.
export const dynamicParams = false;

export function generateStaticParams() {
  return legalLocales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    pathFor: paths.privacy,
    available: legalLocales,
    title: withStudio(t("privacyTitle")),
    description: t("websitePrivacyDescription"),
  });
}

export default async function WebsitePrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLegal(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "websitePolicy" });
  const { summary, sections } = await buildWebsitePolicy(locale);
  const targets = Object.fromEntries(locales.map((l) => [l, hasLegal(l) ? paths.privacy(l) : paths.home(l)])) as Record<Locale, string>;
  return (
    <PageShell locale={locale} targets={targets}>
      <Doc locale={locale} eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} summary={summary} sections={sections} />
    </PageShell>
  );
}
