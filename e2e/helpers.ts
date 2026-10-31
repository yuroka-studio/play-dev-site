// Shared by the specs. Everything is derived from site.config.ts and the
// messages files, so the suite keeps passing after you replace the example.
import fs from "node:fs";
import path from "node:path";
import type { ConsoleMessage, Page } from "@playwright/test";
import config from "../site.config";

export const ORIGIN = "http://localhost:4100";
export const locales = config.locales;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = config.defaultLocale;
export const legalLocales: readonly Locale[] = config.legalLocales ?? config.locales;
export const apps = config.apps;
export type App = (typeof apps)[number];
export const accountApps = apps.filter((a) => a.practices.hasAccount);
export const noAccountApps = apps.filter((a) => !a.practices.hasAccount);

export type Messages = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export function messages(locale: string): Messages {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"));
}

export type PageSpec = {
  url: string;
  locale: Locale;
  kind: "home" | "website-privacy" | "app-privacy" | "delete";
  app?: App;
};

/** Every page the config should produce, in every language that has it. */
export function allPages(): PageSpec[] {
  const pages: PageSpec[] = [];
  for (const locale of locales) pages.push({ url: `/${locale}`, locale, kind: "home" });
  for (const locale of legalLocales) {
    pages.push({ url: `/${locale}/privacy`, locale, kind: "website-privacy" });
    for (const app of apps) {
      pages.push({ url: `/${locale}/apps/${app.id}/privacy`, locale, kind: "app-privacy", app });
      if (app.practices.hasAccount) pages.push({ url: `/${locale}/apps/${app.id}/delete-account`, locale, kind: "delete", app });
    }
  }
  return pages;
}

/** Collects console errors, page errors, failed requests and requests to other origins. */
export function watch(page: Page) {
  const problems: string[] = [];
  const thirdParty: string[] = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() !== "error" && m.type() !== "warning") return;
    // Chrome logs the intended 404 status of a not-found document itself
    const docStatus = /Failed to load resource: .* 404/.test(m.text()) && m.location().url === page.url();
    if (!docStatus) problems.push(`console.${m.type()}: ${m.text()} @ ${m.location().url}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on("request", (r) => {
    if (!r.url().startsWith(ORIGIN) && !r.url().startsWith("data:")) thirdParty.push(r.url());
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && r.request().resourceType() !== "document") problems.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  return { problems, thirdParty };
}

/** Text of the visible page, whitespace collapsed. */
export async function mainText(page: Page): Promise<string> {
  return (await page.locator("main").innerText()).replace(/\s+/g, " ");
}
