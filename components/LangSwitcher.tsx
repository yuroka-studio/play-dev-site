import { getTranslations } from "next-intl/server";
import { locales, type Locale } from "@/lib/config";
import { languageName } from "@/lib/format";

/** One link per language to the same page (or the home page where a page has no translation). */
export async function LangSwitcher({ locale, targets }: { locale: Locale; targets: Record<Locale, string> }) {
  if (locales.length < 2) return null;
  const t = await getTranslations({ locale, namespace: "a11y" });
  return (
    <nav className="lang" aria-label={t("language")}>
      <ul>
        {locales.map((l) => (
          <li key={l}>
            <a href={targets[l]} lang={l} hrefLang={l} aria-current={l === locale ? "true" : undefined}>
              {languageName(l)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
