// Types for site.config.ts.
//
// Everything here is a type only (erased at build time), so site.config.ts can
// be imported by plain Node scripts (scripts/postbuild.mjs) as well as by Next.
//
// `L` is the union of your locale codes, e.g. "en" | "tr". Every piece of
// per-language copy is a `Record<L, string>`: add a locale to `locales` in
// site.config.ts and `npm run typecheck` lists every string you still have to
// translate.

/** One piece of copy in every locale. */
export type Localized<L extends string> = Record<L, string>;

/** Where the app's data lives. */
export type StorageKind =
  /** Everything stays on the user's phone; nothing is sent to you. */
  | "device-only"
  /** The app sends data to a server (yours or a backend service). */
  | "server";

/** Ways an account is identified or created. Add your own wording in the messages if you need more. */
export type AccountIdentifier =
  | "email"
  | "username"
  | "display-name"
  | "password"
  | "phone"
  | "google-sign-in"
  | "apple-sign-in"
  | "anonymous-id";

/** Kinds of data the app may send to a server. */
export type DataCategory =
  | "account-info"
  | "user-content"
  | "settings"
  | "usage"
  | "device-info"
  | "crash-logs"
  | "approx-location"
  | "precise-location"
  | "photos-media"
  | "contacts"
  | "purchase-info"
  | "support-messages";

/** Android permissions the app asks the user to grant, in plain words. */
export type PermissionId =
  | "camera"
  | "microphone"
  | "location"
  | "photos-media"
  | "contacts"
  | "calendar"
  | "notifications"
  | "bluetooth"
  | "files"
  | "other";

export interface PermissionUse<L extends string> {
  id: PermissionId;
  /** Why the app needs it, e.g. { en: "to scan a barcode", tr: "barkod okumak için" }. Starts with "to ..." in English. */
  purpose: Localized<L>;
  /** Only for id "other": the permission's name as users see it. */
  label?: string;
}

/** Data the developer must keep after an account is deleted (legal, accounting, abuse prevention ...). */
export interface KeptRecord<L extends string> {
  /** What is kept, e.g. { en: "Invoices and purchase records" }. */
  what: Localized<L>;
  /** Why it is kept. */
  why: Localized<L>;
  /** For how many days it is kept after the deletion request. */
  days: number;
}

export interface Deletion<L extends string> {
  /**
   * Steps inside the app, if the app has an in-app delete option, e.g.
   * { en: ["Open Settings", "Tap Account", "Tap Delete account"] }.
   * Leave out when users can only ask by email.
   */
  inAppSteps?: Record<L, string[]>;
  /** The request is completed within this many days (Play wants a clear time frame). */
  processingDays: number;
  /** Users can ask for some data to be deleted without closing the account. */
  partialDeletion: boolean;
  /** Backup copies are purged within this many days. Leave out if backups are not kept. */
  backupDays?: number;
  /** Data that is kept after deletion, with the reason and period. Empty array = nothing is kept. */
  kept: KeptRecord<L>[];
}

/** The app's account situation. When `hasAccount` is true, the delete-account page is generated. */
export type AccountPractices<L extends string> =
  | { hasAccount: false }
  | {
      hasAccount: true;
      /** What users sign up or sign in with. */
      identifiers: AccountIdentifier[];
      deletion: Deletion<L>;
    };

/** How long data the developer holds is kept. Ignored for device-only apps. */
export type Retention =
  /** Kept while the account exists (or until the user asks to delete it). */
  | { kind: "until-deleted" }
  /** Deleted this many days after the user last used the app. */
  | { kind: "days-after-last-use"; days: number };

/**
 * The privacy checklist for one app. The privacy policy page is written from
 * these answers, so keep them true. Review the generated text before publishing.
 */
export type DataPractices<L extends string> = {
  storage: StorageKind;
  /** What the app sends to a server. Required (non-empty) when storage is "server". */
  serverData: DataCategory[];
  /** Third-party analytics / crash-reporting / other SDKs by name, e.g. ["Firebase Crashlytics"]. Empty = none. */
  sdks: string[];
  /** Ads: false, or the ad network names, e.g. { networks: ["Google AdMob"] }. */
  ads: false | { networks: string[] };
  /** Paid features sold through Google Play Billing. */
  payments: boolean;
  /** Permissions the app asks users to grant. Empty = none. */
  permissions: PermissionUse<L>[];
  /** How long data you hold is kept (server apps only). */
  retention: Retention;
} & AccountPractices<L>;

export type AppStatus = "live" | "closed-testing" | "in-development";

export interface AppConfig<L extends string> {
  /** Lowercase letters, digits and dashes. Used in URLs: /en/apps/<id>/privacy */
  id: string;
  /** The app's name as shown on Google Play. */
  name: string;
  /** One or two sentences per language. */
  description: Localized<L>;
  status: AppStatus;
  /** Google Play listing (or the closed-testing opt-in link). Leave out until you have one. */
  playUrl?: string;
  /** A public web version of the app, if any. */
  webUrl?: string;
  practices: DataPractices<L>;
}

export interface Hosting {
  /** Who serves this website, named in the website privacy policy. "Netlify", "GitHub Pages", "Cloudflare Pages" ... */
  name: string;
  /** The host's own privacy policy, linked from the website privacy policy. */
  privacyUrl?: string;
}

export interface SiteConfig<L extends string> {
  /** Shown in the header, footer and page titles. */
  studioName: string;
  /** Your developer name exactly as it appears on Google Play. Named in every policy. */
  developerName: string;
  /** Public contact address. Named in every policy and used for deletion requests. */
  contactEmail: string;
  /** Country or jurisdiction you operate from, named in the policies. */
  country: string;
  /** Where the site will live, with https and no trailing slash. Used for canonical links and the sitemap. */
  websiteUrl: string;
  /** Language codes; one messages/<code>.json file each. */
  locales: readonly L[];
  /** Language of the "/" fallback and of x-default. Must be in `locales`. */
  defaultLocale: L;
  /**
   * Locales whose messages file contains the full policy text. Locales not
   * listed get the home page only; their cards link to the default-language
   * policy pages and are marked with the language code. Default: all locales.
   */
  legalLocales?: readonly L[];
  /** Brand colour as #rrggbb. Text colours are derived so contrast always passes. */
  accentColor: string;
  /** Short "about" text for the home page, per language. */
  about: Localized<L>;
  /** Your web host, named in the website privacy policy. */
  hosting: Hosting;
  /** ISO date (YYYY-MM-DD) shown as "Last updated" on every policy. Change it whenever you change a policy. */
  policyLastUpdated: string;
  apps: AppConfig<L>[];
}
