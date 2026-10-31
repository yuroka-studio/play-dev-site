import { expect, test } from "@playwright/test";
import config from "../site.config";
import { allPages, locales, watch } from "./helpers";

// The site makes the promises its own privacy policy makes: no cookies, no
// storage, no requests to other sites, no tracking scripts.

test("no cookies, no storage and no third-party requests on any page", async ({ page, context }) => {
  const seen = watch(page);
  const urls = [...allPages().map((p) => p.url), `/${locales[0]}/nope`];
  for (const url of urls) {
    await page.goto(url, { waitUntil: "networkidle" });
    const storage = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie }));
    expect(storage, url).toEqual({ local: 0, session: 0, cookie: "" });
  }
  expect(await context.cookies()).toEqual([]);
  expect(seen.thirdParty).toEqual([]);
  expect(seen.problems, seen.problems.join("\n")).toEqual([]);
});

test("no page contains scripts or embeds from other origins", async ({ request }) => {
  for (const { url } of allPages()) {
    const html = await (await request.get(url)).text();
    const external = [...html.matchAll(/<(?:script|iframe|img|link|source)\b[^>]*?\b(?:src|href)="(https?:\/\/[^"]+)"/g)]
      .map((m) => m[1])
      // canonical/alternate links point at the site's own configured address
      .filter((u) => !u.startsWith(config.websiteUrl));
    expect(external, url).toEqual([]);
    expect(html).not.toMatch(/<iframe/i);
  }
});

test("security headers are served", async ({ request }) => {
  const res = await request.get(`/${locales[0]}`);
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["content-security-policy"]).toContain("frame-src 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBeTruthy();
  expect(h["set-cookie"]).toBeUndefined();
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.headers()["content-type"]).toContain("application/manifest+json");
  const asset = await request.get("/icon.svg");
  expect(asset.status()).toBe(200);
});

test("robots.txt and sitemap.xml list every page", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain(`Sitemap: ${config.websiteUrl}/sitemap.xml`);
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const { url } of allPages()) expect(xml, url).toContain(`<loc>${config.websiteUrl}${url}</loc>`);
  expect(xml).not.toContain("localhost");
});
