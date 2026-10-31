// Runs after `next build` (static export to out/).
//
//  1. Writes out/index.html: a language chooser for "/" (Netlify redirects "/"
//     by browser language before this file is ever served; on hosts without
//     redirects, such as GitHub Pages, visitors pick their language here).
//  2. Writes out/.nojekyll (GitHub Pages would otherwise drop _next/), removes
//     the unused RSC payloads (*.txt) and, on Cloudflare Pages, writes
//     out/_headers from netlify.toml.
//  3. Checks that every page the config implies exists, and that netlify.toml
//     has a redirect and a 404 rule for every language.
//  4. Hygiene gate: fails when example values from site.config.ts are still in
//     the output (unless ALLOW_EXAMPLE=1) or when a tracker/embed appears.
//
// Safe to run twice. Usage: node scripts/postbuild.mjs [--dir out]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";
import { report, scan } from "./lib/hygiene.mjs";
import { accentVars } from "../lib/color.ts";
import config from "../site.config.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argDir = process.argv.indexOf("--dir");
const out = path.resolve(root, argDir > -1 ? process.argv[argDir + 1] : "out");
if (!fs.existsSync(out)) {
  console.error('postbuild: out/ is missing: run "next build" first.');
  process.exit(1);
}

const problems = [];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const { locales, defaultLocale } = config;
const legalLocales = config.legalLocales ?? locales;

// --- 1. language chooser -------------------------------------------------
const name = (code) => {
  const n = new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
  return n.charAt(0).toLocaleUpperCase(code) + n.slice(1);
};
const a = accentVars(config.accentColor);
const chooser = `<!doctype html>
<html lang="${esc(defaultLocale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(config.studioName)}</title>
<meta name="description" content="${esc(config.about[defaultLocale])}">
<meta name="robots" content="noindex, follow">
<meta name="theme-color" content="${esc(config.accentColor)}">
<link rel="canonical" href="${esc(config.websiteUrl)}/${esc(defaultLocale)}">
${locales.map((l) => `<link rel="alternate" hreflang="${esc(l)}" href="${esc(config.websiteUrl)}/${esc(l)}">`).join("\n")}
<link rel="alternate" hreflang="x-default" href="${esc(config.websiteUrl)}/${esc(defaultLocale)}">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>
:root{--accent:${a.accent};--accent-ink:${a.accentInk};--ink:#14181c;--muted:#4b5661;--line:#d6dce1;color-scheme:light}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:1.25rem;background:#fff;color:var(--ink);font:1.0625rem/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
main{width:100%;max-width:34rem}
h1{margin:0 0 1.5rem;font-size:clamp(1.9rem,1.3rem + 3vw,2.75rem);line-height:1.15;letter-spacing:-.02em}
ul{list-style:none;margin:0;padding:0;display:grid;gap:.75rem}
a{display:block;padding:1rem 1.15rem;border:1px solid var(--line);border-left:6px solid var(--accent);border-radius:12px;color:var(--ink);text-decoration:none;min-height:44px}
a:hover{background:#f4f6f7}
a:focus-visible{outline:3px solid var(--accent-ink);outline-offset:2px}
strong{display:block;color:var(--accent-ink);font-size:1.15rem}
span{display:block;color:var(--muted);font-size:.95rem;overflow-wrap:anywhere}
</style>
</head>
<body>
<main id="main">
<h1 translate="no">${esc(config.studioName)}</h1>
<ul>
${locales
  .map((l) => `<li><a href="/${esc(l)}" lang="${esc(l)}" hreflang="${esc(l)}"><strong>${esc(name(l))}</strong><span>${esc(config.about[l])}</span></a></li>`)
  .join("\n")}
</ul>
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(out, "index.html"), chooser);

// --- 2. housekeeping --------------------------------------------------------
fs.writeFileSync(path.join(out, ".nojekyll"), "");
fs.rmSync(path.join(out, "_not-found.html"), { force: true });

let removed = 0;
(function prune(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      prune(p);
      if (fs.readdirSync(p).length === 0) fs.rmdirSync(p);
    } else if (e.name.endsWith(".txt") && path.relative(out, p) !== "robots.txt") {
      fs.unlinkSync(p);
      removed += 1;
    }
  }
})(out);

const netlifyToml = path.join(root, "netlify.toml");
const netlify = fs.existsSync(netlifyToml) ? parse(fs.readFileSync(netlifyToml, "utf8")) : null;

if (netlify && (process.env.CF_PAGES === "1" || process.env.DEPLOY_TARGET === "cloudflare")) {
  // Cloudflare Pages reads _headers instead of netlify.toml.
  const blocks = (netlify.headers ?? []).map((h) => `${h.for}\n${Object.entries(h.values).map(([k, v]) => `  ${k}: ${v}`).join("\n")}`);
  fs.writeFileSync(path.join(out, "_headers"), `${blocks.join("\n\n")}\n`);
  console.log("postbuild: wrote _headers for Cloudflare Pages");
}

// --- 3. structure -------------------------------------------------------------
const exists = (rel) => fs.existsSync(path.join(out, rel));
const expect = (rel) => {
  if (!exists(rel)) problems.push(`missing page: ${rel}`);
};
expect("404.html");
expect("sitemap.xml");
expect("robots.txt");
for (const l of locales) {
  expect(`${l}.html`);
  expect(`${l}/404.html`);
}
for (const l of legalLocales) {
  expect(`${l}/privacy.html`);
  for (const app of config.apps) {
    expect(`${l}/apps/${app.id}/privacy.html`);
    const file = `${l}/apps/${app.id}/delete-account.html`;
    if (app.practices.hasAccount) expect(file);
    else if (exists(file)) problems.push(`unexpected delete-account page for ${app.id}, which has no accounts`);
  }
}

if (netlify) {
  const redirects = netlify.redirects ?? [];
  const has = (from, to, status, language) =>
    redirects.some((r) => r.from === from && r.to === to && (status === undefined || r.status === status) && (language ? r.conditions?.Language?.includes(language) : !r.conditions?.Language));
  for (const l of locales) {
    if (!has(`/${l}/*`, `/${l}/404.html`, 404)) {
      problems.push(`netlify.toml has no 404 rule for "${l}". Add:\n    [[redirects]]\n      from = "/${l}/*"\n      to = "/${l}/404.html"\n      status = 404`);
    }
    if (l !== defaultLocale && !has("/", `/${l}`, 302, l)) {
      problems.push(`netlify.toml has no language redirect for "${l}". Add (above the default-language rule):\n    [[redirects]]\n      from = "/"\n      to = "/${l}"\n      status = 302\n      force = true\n      conditions = { Language = ["${l}"] }`);
    }
  }
  if (!has("/", `/${defaultLocale}`, 302)) problems.push(`netlify.toml has no fallback redirect from "/" to "/${defaultLocale}".`);
}

if (problems.length > 0) {
  console.error(`postbuild: ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}

// --- 4. hygiene gate ------------------------------------------------------------
const result = scan(out);
if (!report(result, { allowExample: process.env.ALLOW_EXAMPLE === "1" })) {
  console.error("\npostbuild: build failed the hygiene gate.");
  process.exit(1);
}

let bytes = 0;
let files = 0;
(function size(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) size(p);
    else {
      bytes += fs.statSync(p).size;
      files += 1;
    }
  }
})(out);
console.log(`postbuild: removed ${removed} RSC .txt payloads; out/ = ${(bytes / 1024).toFixed(0)} KB in ${files} files`);
console.log(`postbuild: ${result.files} text files scanned; no trackers${process.env.ALLOW_EXAMPLE === "1" ? "; example values allowed (ALLOW_EXAMPLE=1)" : "; no example values"}`);
