import { getTranslations } from "next-intl/server";
import { defaultLocale, hasLegal, paths, type App, type Locale } from "@/lib/config";
import { languageName } from "@/lib/format";
import { LegalLink } from "./LegalLink";

export async function AppCard({ app, locale }: { app: App; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "app" });
  const ta = await getTranslations({ locale, namespace: "a11y" });
  const foreign = !hasLegal(locale);
  return (
    <article className="card" id={`app-${app.id}`} aria-labelledby={`app-${app.id}-name`}>
      <div className="card-head">
        <span className="monogram" aria-hidden="true">
          {Array.from(app.name)[0]}
        </span>
        <div>
          <h3 id={`app-${app.id}-name`} translate="no">
            {app.name}
          </h3>
          <p className="status" data-status={app.status}>
            <span className="dot" aria-hidden="true" />
            {t(`status.${app.status}`)}
          </p>
        </div>
      </div>
      <p className="desc">{app.description[locale]}</p>
      {app.playUrl || app.webUrl ? (
        <div className="actions">
          {app.playUrl ? (
            <a className="btn" href={app.playUrl} rel="noopener">
              {t("play")}
            </a>
          ) : null}
          {app.webUrl ? (
            <a className="btn btn-quiet" href={app.webUrl} rel="noopener">
              {t("web")}
            </a>
          ) : null}
        </div>
      ) : null}
      <ul className="card-links" aria-label={ta("appLinks", { app: app.name })}>
        <li>
          <LegalLink locale={locale} build={(l) => paths.appPrivacy(l, app.id)} note>
            {t("privacy")}
          </LegalLink>
        </li>
        {app.practices.hasAccount ? (
          <li>
            <LegalLink locale={locale} build={(l) => paths.appDelete(l, app.id)} note>
              {t("deleteAccount")}
            </LegalLink>
          </li>
        ) : null}
      </ul>
      {foreign ? (
        <p className="fine">{t("policyNote", { code: defaultLocale.toUpperCase(), language: languageName(defaultLocale, locale) })}</p>
      ) : null}
    </article>
  );
}
