import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// This template makes no network calls at build time and none while you edit it.
// Two Next.js defaults would break that promise, so both are switched off:
//  - Anonymous telemetry. Set here for `next build` (it works in every shell,
//    Windows included). `npm run dev` and `npm run build` also start Next.js
//    through scripts/next.mjs, which sets it before Next.js loads, because the
//    CLI process of `next dev` never reads this file. netlify.toml sets it too.
//  - The upgrade nudge (`experimental.agentUpgrade`, below). It asks
//    registry.npmjs.org for security advisories during `next build` and
//    `next dev` in a terminal or under an AI coding agent. e2e/network.spec.ts
//    fails if either switch goes missing.
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
  // Next.js 16 checks npm for security advisories by default. This template
  // makes no network calls at build time, so that check stays off. (Next.js
  // lists "agentUpgrade" under "Experiments" in its output: that is this switch.)
  experimental: { agentUpgrade: false },
};

export default withNextIntl(nextConfig);
