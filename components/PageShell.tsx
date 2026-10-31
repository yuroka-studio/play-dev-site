import type { ReactNode } from "react";
import type { Locale } from "@/lib/config";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Header, <main id="main"> and footer around every page. */
export function PageShell({ locale, targets, children }: { locale: Locale; targets: Record<Locale, string>; children: ReactNode }) {
  return (
    <>
      <SiteHeader locale={locale} targets={targets} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
