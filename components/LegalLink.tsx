import type { ReactNode } from "react";
import { defaultLocale, hasLegal, type Locale } from "@/lib/config";

/**
 * A link to a legal page. When the visitor's language has no policy text, the
 * link goes to the default-language page and is marked with its language code.
 * `build` maps a locale to the page's path.
 */
export function LegalLink({
  locale,
  build,
  children,
  className,
  note = false,
}: {
  locale: Locale;
  build: (l: Locale) => string;
  children: ReactNode;
  className?: string;
  /** Show the "(EN)" marker when the page is in another language. */
  note?: boolean;
}) {
  const own = hasLegal(locale);
  const target = own ? locale : defaultLocale;
  return (
    <a className={className} href={build(target)} hrefLang={target}>
      {children}
      {!own && note ? (
        <span className="lang-tag" lang={target}>
          {" "}
          ({target.toUpperCase()})
        </span>
      ) : null}
    </a>
  );
}
