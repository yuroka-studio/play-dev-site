import { getTranslations } from "next-intl/server";
import { paths, site, type Locale } from "@/lib/config";
import { LangSwitcher } from "./LangSwitcher";
import { LegalLink } from "./LegalLink";

export async function SiteHeader({ locale, targets }: { locale: Locale; targets: Record<Locale, string> }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const ta = await getTranslations({ locale, namespace: "a11y" });
  return (
    <header className="site-header">
      <div className="wrap bar">
        <a className="brand" href={paths.home(locale)} translate="no">
          {site.studioName}
        </a>
        <nav className="nav" aria-label={ta("mainNav")}>
          <ul>
            <li>
              <a href={`${paths.home(locale)}#apps`}>{t("apps")}</a>
            </li>
            <li>
              <a href={`${paths.home(locale)}#contact`}>{t("contact")}</a>
            </li>
            <li>
              <LegalLink locale={locale} build={paths.privacy}>
                {t("privacy")}
              </LegalLink>
            </li>
          </ul>
        </nav>
        <LangSwitcher locale={locale} targets={targets} />
      </div>
    </header>
  );
}
