import type { MetadataRoute } from "next";
import { defaultLocale, site } from "@/lib/config";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.studioName,
    short_name: site.studioName,
    description: site.about[defaultLocale],
    start_url: `/${defaultLocale}`,
    scope: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: site.accentColor,
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
