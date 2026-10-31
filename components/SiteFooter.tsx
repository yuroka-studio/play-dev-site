import { getTranslations } from "next-intl/server";
import { paths, site, type Locale } from "@/lib/config";
import { LegalLink } from "./LegalLink";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const ta = await getTranslations({ locale, namespace: "a11y" });
  return (
    <footer className="site-footer">
      <div className="wrap foot">
        <p>
          © {new Date().getFullYear()} <span translate="no">{site.studioName}</span>
        </p>
        <nav aria-label={ta("footerNav")}>
          <ul>
            <li>
              <LegalLink locale={locale} build={paths.privacy} note>
                {t("privacy")}
              </LegalLink>
            </li>
            <li>
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
