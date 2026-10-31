import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "@/lib/config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  // Static site: no middleware and no NEXT_LOCALE cookie (the site sets no cookies).
  localeCookie: false,
  alternateLinks: false,
});
