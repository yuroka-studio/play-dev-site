// Scans the built site (out/) for things that must never ship.
//
//  1. PLACEHOLDERS: values from the example site.config.ts. If one is still in
//     the output you forgot to replace it. Bypass with ALLOW_EXAMPLE=1 (CI).
//  2. TRACKERS: analytics, ad and font-CDN hosts and iframes. This template
//     has none, and the build keeps it that way.
//
// Only text files that end up as pages are scanned (.html .xml .txt .json
// .webmanifest .svg); JavaScript and CSS chunks are skipped to avoid false hits.
import fs from "node:fs";
import path from "node:path";

/** Markers of the example config. Keep this list in step with site.config.ts as shipped. */
export const PLACEHOLDERS = [
  { name: "the studio name", re: /Example Studio/ },
  { name: "the example country", re: /Exampleland/ },
  { name: "an example.com/.org/.net address", re: /\bexample\.(?:com|org|net)\b/i },
  { name: "the example app Lantern Notes", re: /Lantern Notes|lantern-notes|lanternnotes/i },
  { name: "the example app Pixel Garden", re: /Pixel Garden|pixel-garden|pixelgarden/i },
  { name: "the example app Tide Table", re: /Tide Table|tide-table|tidetable/i },
];

/** Anything that phones home or loads from another site. */
export const TRACKERS = [
  { name: "Google Analytics / Tag Manager", re: /googletagmanager\.com|google-analytics\.com|\bgtag\(/i },
  { name: "Facebook pixel", re: /connect\.facebook\.net|\bfbq\(/i },
  { name: "an ad network", re: /doubleclick\.net|googlesyndication\.com|adservice\.google/i },
  { name: "an analytics service", re: /plausible\.io|hotjar\.com|mixpanel\.com|segment\.(?:com|io)|fullstory\.com|clarity\.ms/i },
  { name: "Google Fonts", re: /fonts\.googleapis\.com|fonts\.gstatic\.com/i },
  { name: "an iframe embed", re: /<iframe\b/i },
];

const SCANNED = new Set([".html", ".xml", ".txt", ".json", ".webmanifest", ".svg"]);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** Returns { placeholders, trackers, files }: each hit is { file, name, text }. */
export function scan(dir) {
  const placeholders = [];
  const trackers = [];
  let files = 0;
  for (const file of walk(dir)) {
    if (!SCANNED.has(path.extname(file))) continue;
    files += 1;
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(dir, file).split(path.sep).join("/");
    for (const { name, re } of PLACEHOLDERS) {
      const m = text.match(re);
      if (m) placeholders.push({ file: rel, name, text: m[0] });
    }
    for (const { name, re } of TRACKERS) {
      const m = text.match(re);
      if (m) trackers.push({ file: rel, name, text: m[0] });
    }
  }
  return { placeholders, trackers, files };
}

/** One line per kind of finding: what it is, in how many files, and where first. */
function summarize(hits) {
  const groups = new Map();
  for (const h of hits) {
    const g = groups.get(h.name) ?? { text: h.text, files: [] };
    g.files.push(h.file);
    groups.set(h.name, g);
  }
  return [...groups]
    .map(([name, g]) => `  ${name}: "${g.text}" in ${g.files.length} file${g.files.length === 1 ? "" : "s"} (first: ${g.files[0]})`)
    .join("\n");
}

/**
 * Prints the findings and returns true when the build may continue.
 * `allowExample` (ALLOW_EXAMPLE=1) lets placeholders through with a warning.
 */
export function report(result, { allowExample = false, log = console } = {}) {
  let ok = true;
  if (result.trackers.length > 0) {
    ok = false;
    log.error(`\nThe output loads from, or talks to, another site. This template ships no trackers or third-party embeds:\n${summarize(result.trackers)}`);
  }
  if (result.placeholders.length > 0) {
    if (allowExample) {
      log.warn(`\nWarning: the output still contains example values (allowed because ALLOW_EXAMPLE=1). Never deploy this build.`);
    } else {
      ok = false;
      log.error(
        `\nThe build still contains values from the example site.config.ts, so it is not safe to publish:\n${summarize(result.placeholders)}\n\n` +
          `Fix: edit site.config.ts (studio name, developer name, email, country, website URL and your apps).\n` +
          `To build the example on purpose (CI, previews), run with ALLOW_EXAMPLE=1; to run the tests on the example, use: npm run test:example`,
      );
    }
  }
  return ok;
}
