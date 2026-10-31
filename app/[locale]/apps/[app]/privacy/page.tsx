import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Doc } from "@/components/Doc";
import { PageShell } from "@/components/PageShell";
import { apps, findApp, hasLegal, legalLocales, locales, paths, site, type Locale } from "@/lib/config";
import { pageMetadata, withStudio } from "@/lib/metadata";
import { buildAppPolicy } from "@/lib/policy";

// One privacy policy per app, written from the app's data practices in site.config.ts.
export const dynamicParams = false;

export function generateStaticParams() {
  return legalLocales.flatMap((locale) => apps.map((app) => ({ locale, app: app.id })));
}

type Props = { params: Promise<{ locale: Locale; app: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, app: appId } = await params;
  setRequestLocale(locale);
  const app = findApp(appId);
  if (!app) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    pathFor: (l) => paths.appPrivacy(l, app.id),
    available: legalLocales,
    title: withStudio(t("appPrivacyTitle", { app: app.name })),
    description: t("appPrivacyDescription", { app: app.name, developer: site.developerName }),
  });
}

export default async function AppPrivacyPage({ params }: Props) {
  const { locale, app: appId } = await params;
  const app = findApp(appId);
  if (!app || !hasLegal(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "policy" });
  const { summary, sections } = await buildAppPolicy(app, locale);
  const targets = Object.fromEntries(locales.map((l) => [l, hasLegal(l) ? paths.appPrivacy(l, app.id) : paths.home(l)])) as Record<Locale, string>;
  return (
    <PageShell locale={locale} targets={targets}>
      <Doc
        locale={locale}
        eyebrow={t("eyebrow")}
        title={t("title", { app: app.name })}
        intro={t("intro", { app: app.name, developer: site.developerName, country: site.country })}
        summary={summary}
        sections={sections}
      />
    </PageShell>
  );
}
