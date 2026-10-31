import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Doc } from "@/components/Doc";
import { PageShell } from "@/components/PageShell";
import { appsWithAccounts, findApp, hasLegal, legalLocales, locales, nonEmpty, paths, site, type Locale } from "@/lib/config";
import { buildDeletePage } from "@/lib/delete-page";
import { pageMetadata, withStudio } from "@/lib/metadata";

// The account and data deletion page. Generated only for apps with accounts:
// generateStaticParams lists just those, and dynamicParams = false means every
// other app has no such page (the host serves the localized 404 instead).
export const dynamicParams = false;

export function generateStaticParams() {
  return nonEmpty(legalLocales.flatMap((locale) => appsWithAccounts.map((app) => ({ locale, app: app.id }))));
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
    pathFor: (l) => paths.appDelete(l, app.id),
    available: legalLocales,
    title: withStudio(t("deleteTitle", { app: app.name })),
    description: t("deleteDescription", { app: app.name, developer: site.developerName }),
  });
}

export default async function DeleteAccountPage({ params }: Props) {
  const { locale, app: appId } = await params;
  const app = findApp(appId);
  if (!app || !app.practices.hasAccount || !hasLegal(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "deletePage" });
  const { sections, after } = await buildDeletePage(app, locale);
  const targets = Object.fromEntries(locales.map((l) => [l, hasLegal(l) ? paths.appDelete(l, app.id) : paths.home(l)])) as Record<Locale, string>;
  return (
    <PageShell locale={locale} targets={targets}>
      <Doc
        locale={locale}
        eyebrow={t("eyebrow")}
        title={t("title", { app: app.name })}
        intro={t("intro", { app: app.name, developer: site.developerName })}
        sections={sections}
        after={after}
      />
    </PageShell>
  );
}
