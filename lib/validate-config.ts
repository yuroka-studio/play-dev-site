// Build-time checks for site.config.ts. TypeScript catches missing fields;
// this catches values that type-check but would produce a broken or wrong site.
import type { AppConfig, SiteConfig } from "./types";

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const APP_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const LOCALE_CODE = /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/;

function isHttps(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Returns a list of human-readable problems; an empty list means the config is fine. */
export function validateConfig(config: SiteConfig<string>): string[] {
  const errors: string[] = [];
  const err = (message: string) => errors.push(message);

  for (const key of ["studioName", "developerName", "country"] as const) {
    if (!config[key]?.trim()) err(`${key} must not be empty.`);
  }
  if (!EMAIL.test(config.contactEmail ?? "")) err(`contactEmail "${config.contactEmail}" is not an email address.`);
  if (!isHttps(config.websiteUrl)) err(`websiteUrl "${config.websiteUrl}" must be an https:// address.`);
  else if (config.websiteUrl.endsWith("/")) err(`websiteUrl "${config.websiteUrl}" must not end with a slash.`);
  if (!HEX.test(config.accentColor ?? "")) err(`accentColor "${config.accentColor}" must look like #0f766e.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config.policyLastUpdated ?? "") || Number.isNaN(Date.parse(config.policyLastUpdated))) {
    err(`policyLastUpdated "${config.policyLastUpdated}" must be a date like 2026-11-01.`);
  }
  if (!config.hosting?.name?.trim()) err("hosting.name must not be empty.");
  if (config.hosting?.privacyUrl && !isHttps(config.hosting.privacyUrl)) err("hosting.privacyUrl must be an https:// address.");

  // locales
  const { locales, defaultLocale, legalLocales } = config;
  if (!locales?.length) err("locales must list at least one language.");
  for (const l of locales ?? []) if (!LOCALE_CODE.test(l)) err(`locale "${l}" is not a language code like "en" or "pt-BR".`);
  if (new Set(locales).size !== locales?.length) err("locales contains a duplicate.");
  if (!locales?.includes(defaultLocale)) err(`defaultLocale "${defaultLocale}" must be one of locales.`);
  for (const l of legalLocales ?? []) if (!locales.includes(l)) err(`legalLocales has "${l}", which is not in locales.`);
  if (legalLocales && !legalLocales.includes(defaultLocale)) err("legalLocales must include the defaultLocale (other languages link to it).");
  for (const l of locales ?? []) {
    if (!config.about?.[l]?.trim()) err(`about.${l} is missing.`);
  }

  // apps
  const seen = new Set<string>();
  for (const app of config.apps ?? []) {
    const at = `apps["${app.id}"]`;
    if (!APP_ID.test(app.id ?? "")) err(`${at}: id must be lowercase letters, digits and single dashes (like "my-app").`);
    if (seen.has(app.id)) err(`${at}: id is used twice.`);
    seen.add(app.id);
    validateApp(app, locales ?? [], at, err);
  }
  return errors;
}

function validateApp(app: AppConfig<string>, locales: readonly string[], at: string, err: (m: string) => void) {
  if (!app.name?.trim()) err(`${at}: name must not be empty.`);
  for (const l of locales) if (!app.description?.[l]?.trim()) err(`${at}: description.${l} is missing.`);
  if (app.playUrl !== undefined && !isHttps(app.playUrl)) err(`${at}: playUrl must be an https:// address (or leave it out).`);
  if (app.webUrl !== undefined && !isHttps(app.webUrl)) err(`${at}: webUrl must be an https:// address (or leave it out).`);

  const p = app.practices;
  if (!p) return err(`${at}: practices is missing.`);

  if (p.storage === "server" && p.serverData.length === 0) {
    err(`${at}: storage is "server", so list what is sent in serverData.`);
  }
  if (p.storage === "device-only" && p.serverData.length > 0) {
    err(`${at}: storage is "device-only" but serverData is not empty. Use storage: "server" or empty the list.`);
  }
  if (p.hasAccount && p.storage !== "server") {
    err(`${at}: an app with accounts keeps data on a server, so set storage: "server".`);
  }
  if (p.retention.kind === "days-after-last-use" && !(p.retention.days > 0)) err(`${at}: retention.days must be a positive number.`);
  if (p.ads && p.ads.networks.length === 0) err(`${at}: ads is on, so name the ad network(s) in ads.networks.`);

  for (const perm of p.permissions) {
    for (const l of locales) if (!perm.purpose?.[l]?.trim()) err(`${at}: permission "${perm.id}" has no purpose.${l}.`);
    if (perm.id === "other" && !perm.label?.trim()) err(`${at}: permission "other" needs a label.`);
  }

  if (p.hasAccount) {
    if (p.identifiers.length === 0) err(`${at}: hasAccount is true, so list how users sign up in identifiers.`);
    const d = p.deletion;
    if (!(d.processingDays > 0)) err(`${at}: deletion.processingDays must be a positive number.`);
    if (d.backupDays !== undefined && !(d.backupDays > 0)) err(`${at}: deletion.backupDays must be positive (or leave it out).`);
    if (d.inAppSteps) {
      for (const l of locales) if (!d.inAppSteps[l]?.length) err(`${at}: deletion.inAppSteps.${l} is empty (or leave inAppSteps out).`);
    }
    for (const [i, k] of d.kept.entries()) {
      if (!(k.days > 0)) err(`${at}: deletion.kept[${i}].days must be a positive number.`);
      for (const l of locales) {
        if (!k.what?.[l]?.trim()) err(`${at}: deletion.kept[${i}].what.${l} is missing.`);
        if (!k.why?.[l]?.trim()) err(`${at}: deletion.kept[${i}].why.${l} is missing.`);
      }
    }
  }
}

/** Throws one readable error listing every problem. */
export function assertValidConfig(config: SiteConfig<string>): void {
  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new Error(`site.config.ts has ${errors.length} problem${errors.length === 1 ? "" : "s"}:\n  - ${errors.join("\n  - ")}`);
  }
}
