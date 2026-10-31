import { test } from "@playwright/test";
import { accountApps, apps, defaultLocale, locales } from "./helpers";

// Full-page captures for a visual check: SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts
// Output goes to qa/screenshots/ (git-ignored).
test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1 to capture");

const app = accountApps[0] ?? apps[0]; // undefined when the config lists no apps
const hasTr = (locales as readonly string[]).includes("tr");
const SIZES = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 } } as const;

for (const [name, size] of Object.entries(SIZES)) {
  const shots: [string, string][] = [
    ["home", `/${defaultLocale}`],
    ...(app ? ([["app-privacy", `/${defaultLocale}/apps/${app.id}/privacy`]] as [string, string][]) : []),
    ...(app?.practices.hasAccount ? ([["delete-account", `/${defaultLocale}/apps/${app.id}/delete-account`]] as [string, string][]) : []),
    ...(hasTr ? ([["home-tr", "/tr"]] as [string, string][]) : []),
    ...(app?.practices.hasAccount && hasTr ? ([["delete-account-tr", `/tr/apps/${app.id}/delete-account`]] as [string, string][]) : []),
    ["not-found", `/${defaultLocale}/nope`],
  ];
  for (const [label, url] of shots) {
    test(`${label} @ ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(url, { waitUntil: "networkidle" });
      await page.screenshot({ path: `qa/screenshots/${label}-${name}.png`, fullPage: true });
    });
  }
}

// The two pictures in the README: SCREENSHOTS=1 DOCS_SHOTS=1 npx playwright test e2e/screenshots.spec.ts -g README
test.describe("README pictures", () => {
  test.skip(!process.env.DOCS_SHOTS, "set DOCS_SHOTS=1 to refresh docs/screenshots");

  test("README home page", async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await page.goto(`/${defaultLocale}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "docs/screenshots/home-desktop.jpg", type: "jpeg", quality: 72, fullPage: true });
  });

  test("README delete page", async ({ page }) => {
    test.skip(!app?.practices.hasAccount, "needs an app with accounts");
    await page.setViewportSize(SIZES.mobile);
    await page.goto(`/${defaultLocale}/apps/${app?.id}/delete-account`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "docs/screenshots/delete-account-mobile.jpg", type: "jpeg", quality: 72 });
  });
});
