import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// This template makes no network calls at build time, so Next.js's anonymous
// telemetry is switched off here (it also works in every shell, Windows included).
process.env.NEXT_TELEMETRY_DISABLED = "1";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Fully static export (served from out/). No middleware, no server: language
// routing is generateStaticParams plus the redirect rules in netlify.toml.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,
  poweredByHeader: false,
  reactStrictMode: true,
  images: { unoptimized: true },
  // the repository root is where `next build` runs
  turbopack: { root: process.cwd() },
};

export default withNextIntl(nextConfig);
