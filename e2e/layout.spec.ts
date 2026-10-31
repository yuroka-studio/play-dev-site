import { expect, test } from "@playwright/test";
import { allPages, locales } from "./helpers";

// WCAG 1.4.10 reflow: nothing scrolls sideways at 320 CSS px.
const URLS = [...allPages().map((p) => p.url), ...locales.map((l) => `/${l}/nope`)];

for (const url of URLS) {
  test(`no horizontal overflow at 320px: ${url}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(url, { waitUntil: "networkidle" });
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll, `page is ${scroll}px wide in a ${client}px viewport`).toBeLessThanOrEqual(client);
    // and no single element pokes out of the viewport
    const wide = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && getComputedStyle(el).position !== "fixed")
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`),
    );
    expect(wide).toEqual([]);
  });
}
