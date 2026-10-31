import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppCard } from "@/components/AppCard";
import { JsonLd } from "@/components/JsonLd";
import { PageShell } from "@/components/PageShell";
import { apps, locales, paths, site, type Locale } from "@/lib/config";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    pathFor: paths.home,
    available: locales,
    title: t("homeTitle", { studio: site.studioName }),
    description: site.about[locale],
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });
  const targets = Object.fromEntries(locales.map((l) => [l, paths.home(l)])) as Record<Locale, string>;
  return (
    <PageShell locale={locale} targets={targets}>
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 translate="no">{site.studioName}</h1>
          <p className="lede">{site.about[locale]}</p>
        </div>
      </section>

      <section id="apps" className="section" aria-labelledby="apps-heading">
        <div className="wrap">
          <h2 id="apps-heading">{t("appsHeading")}</h2>
          {apps.length === 0 ? (
            <p>{t("appsEmpty")}</p>
          ) : (
            <div className="grid">
              {apps.map((app) => (
                <AppCard key={app.id} app={app} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="contact" className="section section-tint" aria-labelledby="contact-heading">
        <div className="wrap">
          <h2 id="contact-heading">{t("contactHeading")}</h2>
          <p>{t("contactBody")}</p>
          <dl className="facts">
            <div>
              <dt>{t("emailLabel")}</dt>
              <dd>
                <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
              </dd>
            </div>
            <div>
              <dt>{t("developerLabel")}</dt>
              <dd translate="no">{site.developerName}</dd>
            </div>
            <div>
              <dt>{t("countryLabel")}</dt>
              <dd>{site.country}</dd>
            </div>
          </dl>
        </div>
      </section>
      <JsonLd locale={locale} />
    </PageShell>
  );
}
