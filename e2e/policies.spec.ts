import { expect, test } from "@playwright/test";
import config from "../site.config";
import { accountApps, apps, legalLocales, mainText, messages } from "./helpers";

// The generated policy text must name the developer, give the contact, and
// follow the app's data practices.

test.describe("website privacy policy", () => {
  for (const locale of legalLocales) {
    test(`${locale}: names the developer, the contact and the host; says no cookies`, async ({ page }) => {
      await page.goto(`/${locale}/privacy`);
      const text = await mainText(page);
      expect(text).toContain(config.developerName);
      expect(text).toContain(config.contactEmail);
      expect(text).toContain(config.country);
      expect(text).toContain(config.hosting.name);
      const m = messages(locale).websitePolicy;
      expect(text).toContain(m.none.cookies);
      expect(text).toContain(m.none.analytics);
      await expect(page.locator(`main a[href="mailto:${config.contactEmail}"]`).first()).toBeVisible();
      if (config.hosting.privacyUrl) await expect(page.locator(`main a[href="${config.hosting.privacyUrl}"]`)).toHaveCount(1);
      // links to every app policy
      for (const app of apps) await expect(page.locator(`main a[href="/${locale}/apps/${app.id}/privacy"]`)).toHaveCount(1);
    });
  }
});

test.describe("app privacy policies", () => {
  for (const locale of legalLocales) {
    const m = messages(locale);
    for (const app of apps) {
      const p = app.practices;
      test(`${locale}/${app.id}: developer, contact and data practices`, async ({ page }) => {
        await page.goto(`/${locale}/apps/${app.id}/privacy`);
        const text = await mainText(page);

        // identity and contact (what Google Play asks of a privacy policy)
        expect(text).toContain(config.developerName);
        expect(text).toContain(config.contactEmail);
        expect(text).toContain(app.name);
        await expect(page.locator(`main a[href="mailto:${config.contactEmail}"]`).first()).toBeVisible();

        // the review note
        const notice = page.getByTestId("template-notice");
        await expect(notice).toBeVisible();
        await expect(notice).toContainText(m.legal.templateNotice);
        const updated = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${config.policyLastUpdated}T00:00:00Z`));
        await expect(page.locator(".meta")).toContainText(updated);

        // storage
        const otherParties = p.sdks.length > 0 || p.ads !== false || p.payments;
        if (p.storage === "device-only") {
          expect(text).toContain(m.policy.short.deviceOnly);
          const collect = otherParties ? m.policy.collect.deviceOnlyServices : m.policy.collect.deviceOnly;
          expect(text).toContain(collect.replace("{app}", app.name));
          // "nothing is shared" only when no SDK, ad network or purchase flow is involved
          expect(text).toContain(otherParties ? m.policy.sharing.some : m.policy.sharing.none);
        } else {
          expect(text).toContain(m.policy.short.server);
          expect(text).toContain(m.policy.security.body);
        }
        // ads
        if (p.ads) {
          for (const network of p.ads.networks) expect(text).toContain(network);
          expect(text).toContain(m.policy.ads.onChoice);
        } else {
          expect(text).toContain(m.policy.ads.off);
        }
        // sdks
        if (p.sdks.length > 0) for (const sdk of p.sdks) expect(text).toContain(sdk);
        else expect(text).toContain(m.policy.services.noSdks);
        // payments
        expect(text).toContain(p.payments ? m.policy.purchases.on : m.policy.purchases.off);
        // permissions
        if (p.permissions.length > 0) for (const perm of p.permissions) expect(text).toContain(perm.purpose[locale]);
        else expect(text).toContain(m.policy.permissions.off);
        // accounts and deletion
        const deleteLink = page.locator(`main a[href="/${locale}/apps/${app.id}/delete-account"]`);
        await expect(deleteLink).toHaveCount(p.hasAccount ? 1 : 0);
      });
    }
  }
});

test.describe("account and data deletion pages", () => {
  for (const locale of legalLocales) {
    const m = messages(locale);
    for (const app of accountApps) {
      test(`${locale}/${app.id}: steps, deleted data, kept data, mailto link`, async ({ page }) => {
        if (!app.practices.hasAccount) return;
        const d = app.practices.deletion;
        await page.goto(`/${locale}/apps/${app.id}/delete-account`);
        const text = await mainText(page);
        expect(text).toContain(config.developerName);
        expect(text).toContain(app.name);
        expect(text).toContain(config.contactEmail);
        await expect(page.locator("h1")).toContainText(app.name);

        // in-app steps, if the app has them
        const steps = d.inAppSteps?.[locale] ?? [];
        for (const step of steps) expect(text).toContain(step);
        await expect(page.locator("main ol li")).toHaveCount(steps.length);

        // a mailto request link with the app named in the subject
        const request = page.locator('main a[href^="mailto:"][href*="subject="]');
        await expect(request).toHaveCount(1);
        const href = (await request.getAttribute("href")) ?? "";
        expect(href.startsWith(`mailto:${config.contactEmail}?`)).toBe(true);
        expect(decodeURIComponent(href)).toContain(app.name);

        // what is deleted / kept, with periods
        await expect(page.getByRole("heading", { name: m.deletePage.deleted.heading })).toBeVisible();
        await expect(page.getByRole("heading", { name: m.deletePage.kept.heading })).toBeVisible();
        for (const kept of d.kept) {
          expect(text).toContain(kept.what[locale]);
          expect(text).toContain(kept.why[locale]);
        }
        if (d.kept.length === 0 && d.backupDays === undefined) expect(text).toContain(m.deletePage.kept.none);
        expect(text).toMatch(new RegExp(`\\b${d.processingDays}\\b`));
        await expect(page.locator(`main a[href="/${locale}/apps/${app.id}/privacy"]`)).toHaveCount(1);
      });
    }
  }
});
