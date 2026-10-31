// ---------------------------------------------------------------------------
// site.config.ts: the one file you edit.
//
// Everything on the site comes from here: the home page, the website privacy
// policy, one privacy policy per app, and (for apps with accounts) one
// account-deletion page per app.
//
// The values below are a fictional example ("Example Studio"). `npm run build`
// refuses to finish while any of them is left in the output, so you cannot
// ship the example by accident. (CI sets ALLOW_EXAMPLE=1 to build it anyway.)
//
// Rules for this file:
//  - Keep it plain data. It is also read by Node scripts, so use only type
//    imports and no TypeScript-only features such as enums.
//  - Per-language text is a `Record<Locale, string>`. If you add a locale
//    below, `npm run typecheck` shows every string still to be translated.
// ---------------------------------------------------------------------------
import type { SiteConfig } from "./lib/types";

/**
 * Languages of the site. One messages/<code>.json file per code.
 * To add one (say German): add "de" here, copy messages/en.json to
 * messages/de.json and translate it, add a "de" line to every text below,
 * and add the two "de" redirect rules in netlify.toml (the build tells you).
 */
export const locales = ["en", "tr"] as const;
export type Locale = (typeof locales)[number];

const config: SiteConfig<Locale> = {
  // --- Who you are ---------------------------------------------------------

  /** Shown in the header, footer and page titles. */
  studioName: "Example Studio",

  /**
   * Your developer name exactly as it appears on Google Play (Play Console >
   * Settings > Developer account). Every policy names it. May equal studioName.
   */
  developerName: "Example Studio Apps",

  /** Public contact address. Play requires a contact in every privacy policy. */
  contactEmail: "hello@example.com",

  /** Country or jurisdiction you operate from. Named in the policies. */
  country: "Exampleland",

  /** The address this site will be served from: https, no trailing slash. */
  websiteUrl: "https://example.com",

  // --- Site ----------------------------------------------------------------

  locales,
  defaultLocale: "en",

  /**
   * Locales with a full policy text in messages/<code>.json (the "policy",
   * "websitePolicy" and "deletePage" sections). A locale you leave out still
   * gets the home page, and its app cards link to the default-language policy
   * pages, marked with the language code (for example "EN"). Default: all.
   */
  // legalLocales: ["en", "tr"],

  /** Brand colour, #rrggbb. Link and button colours are derived from it so text contrast always passes. */
  accentColor: "#0f766e",

  /** A short introduction for the home page. One or two sentences. */
  about: {
    en: "We are a small independent studio making simple, respectful Android apps.",
    tr: "Sade ve kullanıcıya saygılı Android uygulamaları geliştiren küçük, bağımsız bir stüdyoyuz.",
  },

  // --- Legal ---------------------------------------------------------------

  /** Who serves this site. Named in the website privacy policy (hosts keep access logs). */
  hosting: {
    name: "Netlify",
    privacyUrl: "https://www.netlify.com/privacy/",
  },

  /** "Last updated" date on every policy, YYYY-MM-DD. Change it whenever you change a policy or an app's answers. */
  policyLastUpdated: "2026-11-01",

  // --- Apps ----------------------------------------------------------------
  //
  // One entry per app. The `practices` block is a checklist about what the
  // app does with data; the privacy policy is written from your answers, so
  // keep them true. The delete-account page exists only for apps with
  // `hasAccount: true`.

  apps: [
    // An app with accounts and a server: gets a delete-account page.
    {
      id: "lantern-notes",
      name: "Lantern Notes",
      description: {
        en: "A quiet notes app that syncs your notes between your devices.",
        tr: "Notlarınızı cihazlarınız arasında eşitleyen sade bir not uygulaması.",
      },
      status: "live",
      playUrl: "https://play.google.com/store/apps/details?id=com.example.lanternnotes",
      webUrl: "https://notes.example.com",
      practices: {
        storage: "server",
        serverData: ["account-info", "user-content", "settings", "crash-logs", "purchase-info"],
        sdks: ["Firebase Crashlytics"],
        ads: false,
        payments: true,
        permissions: [
          {
            id: "notifications",
            purpose: {
              en: "to show the reminders you set",
              tr: "belirlediğiniz hatırlatmaları göstermek için",
            },
          },
        ],
        retention: { kind: "until-deleted" },
        hasAccount: true,
        identifiers: ["email", "password", "google-sign-in"],
        deletion: {
          inAppSteps: {
            en: ["Open Lantern Notes and tap Settings.", "Tap Account, then Delete account.", "Confirm with your password."],
            tr: ["Lantern Notes uygulamasını açıp Ayarlar’a dokunun.", "Hesap’a, ardından Hesabı sil’e dokunun.", "Parolanızla onaylayın."],
          },
          processingDays: 30,
          partialDeletion: true,
          backupDays: 35,
          kept: [
            {
              what: { en: "Purchase and invoice records", tr: "Satın alma ve fatura kayıtları" },
              why: { en: "Accounting and tax obligations", tr: "Muhasebe ve vergi yükümlülükleri" },
              days: 2555,
            },
          ],
        },
      },
    },

    // An app with a server but no accounts and with ads: no delete-account page.
    {
      id: "pixel-garden",
      name: "Pixel Garden",
      description: {
        en: "A relaxing puzzle game about growing a tiny pixel garden.",
        tr: "Küçük bir piksel bahçesi yetiştirmeyi konu alan, rahatlatıcı bir bulmaca oyunu.",
      },
      status: "closed-testing",
      practices: {
        storage: "server",
        serverData: ["user-content", "device-info"],
        sdks: [],
        ads: { networks: ["Google AdMob"] },
        payments: false,
        permissions: [],
        retention: { kind: "days-after-last-use", days: 365 },
        hasAccount: false,
      },
    },

    // An app that keeps everything on the device: the simplest policy.
    {
      id: "tide-table",
      name: "Tide Table",
      description: {
        en: "Tide times for the coast near you, stored on your phone.",
        tr: "Yakınınızdaki kıyı için gel-git saatleri; her şey telefonunuzda saklanır.",
      },
      status: "in-development",
      practices: {
        storage: "device-only",
        serverData: [],
        sdks: [],
        ads: false,
        payments: false,
        permissions: [
          {
            id: "location",
            purpose: {
              en: "to pick the nearest tide station (the location stays on your device)",
              tr: "size en yakın gel-git istasyonunu seçmek için (konum cihazınızdan çıkmaz)",
            },
          },
        ],
        retention: { kind: "until-deleted" },
        hasAccount: false,
      },
    },
  ],
};

export default config;
