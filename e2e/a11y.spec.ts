import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { allPages, locales } from "./helpers";

// Automated WCAG 2.1 A/AA checks (axe-core), including colour contrast, on
// every page at desktop and phone width, plus the localized 404s.
const URLS = [...allPages().map((p) => p.url), ...locales.map((l) => `/${l}/nope`), "/nope"];

for (const url of URLS) {
  for (const width of [1280, 360]) {
    test(`axe: ${url} @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url, { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]).analyze();
      const summary = results.violations.map(
        (v) => `${v.id} (${v.impact}): ${v.nodes.length}x ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`,
      );
      expect(summary, summary.join("\n")).toEqual([]);
    });
  }
}
