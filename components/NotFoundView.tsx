import { getTranslations } from "next-intl/server";
import { locales, paths, type Locale } from "@/lib/config";
import { PageShell } from "./PageShell";

/** The localized 404 page. */
export async function NotFoundView({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "notFound" });
  const targets = Object.fromEntries(locales.map((l) => [l, paths.home(l)])) as Record<Locale, string>;
  return (
    <PageShell locale={locale} targets={targets}>
      <div className="wrap not-found">
        <p className="eyebrow">404</p>
        <h1>{t("title")}</h1>
        <p className="lede">{t("body")}</p>
        <p>
          <a className="btn" href={paths.home(locale)}>
            {t("back")}
          </a>
        </p>
      </div>
    </PageShell>
  );
}
