import { expect, test } from "@playwright/test";
import config from "../site.config";
import { allPages, accountApps, apps, defaultLocale, legalLocales, locales, mainText, messages, noAccountApps, watch } from "./helpers";

test.describe("every page returns content", () => {
  for (const spec of allPages()) {
    test(`${spec.url} (${spec.kind})`, async ({ page }) => {
      const seen = watch(page);
      const res = await page.goto(spec.url);
      expect(res?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", spec.locale);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).not.toBeEmpty();
      await expect(page.locator("main#main")).toHaveCount(1);
      expect((await mainText(page)).length).toBeGreaterThan(200);
      expect(await page.title()).toContain(config.studioName);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${config.websiteUrl}${spec.url}`);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index/);
      await page.waitForLoadState("networkidle");
      expect(seen.problems, seen.problems.join("\n")).toEqual([]);
    });
  }
});

test.describe("home page", () => {
  for (const locale of locales) {
    test(`${locale}: one card per app with the right links`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.locator("#apps article.card")).toHaveCount(apps.length);
      for (const app of apps) {
        const card = page.locator(`#app-${app.id}`);
        await expect(card.getByRole("heading", { name: app.name })).toBeVisible();
        await expect(card).toContainText(app.description[locale]);
        const hrefs = await card.locator("a").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
        // a card links to the policy pages of its own language when it has them
        const target = legalLocales.includes(locale) ? locale : defaultLocale;
        expect(hrefs).toContain(`/${target}/apps/${app.id}/privacy`);
        if (app.playUrl) expect(hrefs).toContain(app.playUrl);
        else expect(hrefs.filter((h) => h?.includes("play.google.com"))).toEqual([]);
        if (app.webUrl) expect(hrefs).toContain(app.webUrl);
        // the delete-account link exists exactly when the app has accounts
        const del = hrefs.filter((h) => h?.endsWith("/delete-account"));
        expect(del).toEqual(app.practices.hasAccount ? [`/${target}/apps/${app.id}/delete-account`] : []);
      }
    });

    test(`${locale}: studio name, about text, contact`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.locator("h1")).toHaveText(config.studioName);
      await expect(page.locator(".hero")).toContainText(config.about[locale]);
      await expect(page.locator("#contact").getByRole("link", { name: config.contactEmail })).toHaveAttribute("href", `mailto:${config.contactEmail}`);
      await expect(page.locator("#contact")).toContainText(config.developerName);
    });
  }
});

test.describe("delete-account page exists only for apps with accounts", () => {
  for (const locale of legalLocales) {
    for (const app of accountApps) {
      test(`${locale}/${app.id}: 200`, async ({ request }) => {
        const res = await request.get(`/${locale}/apps/${app.id}/delete-account`);
        expect(res.status()).toBe(200);
      });
    }
    for (const app of noAccountApps) {
      test(`${locale}/${app.id}: 404 and no link to it`, async ({ request, page }) => {
        const res = await request.get(`/${locale}/apps/${app.id}/delete-account`);
        expect(res.status()).toBe(404);
        await page.goto(`/${locale}/apps/${app.id}/privacy`);
        const hrefs = await page.locator("a").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
        expect(hrefs.filter((h) => h?.includes("delete-account"))).toEqual([]);
      });
    }
  }
});

test.describe("404 pages and redirects", () => {
  for (const locale of locales) {
    test(`/${locale}/nope -> localized 404`, async ({ page }) => {
      const res = await page.goto(`/${locale}/definitely/not/here`);
      expect(res?.status()).toBe(404);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("h1")).toHaveText(messages(locale).notFound.title);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    });
  }

  test("unknown path outside a language -> 404 in the default language", async ({ page }) => {
    const res = await page.goto("/no-such-page");
    expect(res?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", defaultLocale);
    await expect(page.locator("h1")).toHaveText(messages(defaultLocale).notFound.title);
  });

  test("/ redirects by Accept-Language, falling back to the default language, without cookies", async ({ request }) => {
    for (const locale of locales) {
      const res = await request.get("/", { headers: { "Accept-Language": `${locale}-XX,${locale};q=0.9` }, maxRedirects: 0 });
      expect(res.status()).toBe(302);
      expect(res.headers()["location"]).toBe(`/${locale}`);
      expect(res.headers()["set-cookie"]).toBeUndefined();
    }
    const other = await request.get("/", { headers: { "Accept-Language": "xx" }, maxRedirects: 0 });
    expect(other.headers()["location"]).toBe(`/${defaultLocale}`);
  });

  test("out/index.html is a language chooser (hosts without redirects)", async ({ page }) => {
    // reached through the redirect on this server; open the file's content directly instead
    const res = await page.request.get("/index.html", { maxRedirects: 0 });
    const html = await res.text();
    for (const l of locales) expect(html).toContain(`href="/${l}"`);
    expect(html).not.toMatch(/http-equiv="refresh"/i);
  });
});
