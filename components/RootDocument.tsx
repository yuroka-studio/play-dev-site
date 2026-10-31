import type { CSSProperties, ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { accentVars } from "@/lib/color";
import { site, type Locale } from "@/lib/config";

/** The <html> element: language, accent colour variables and the skip link. */
export async function RootDocument({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = await getTranslations({ locale, namespace: "a11y" });
  const a = accentVars(site.accentColor);
  const style = { "--accent": a.accent, "--on-accent": a.onAccent, "--accent-ink": a.accentInk } as CSSProperties;
  return (
    <html lang={locale} style={style}>
      <body>
        <a className="skip-link" href="#main">
          {t("skipToContent")}
        </a>
        {children}
      </body>
    </html>
  );
}
