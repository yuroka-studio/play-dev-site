// Builds the privacy policy of one app from its data practices.
// All wording lives in messages/<locale>.json ("policy" and "enums"); this file
// only decides which sentences apply to the answers the developer gave.
import { getTranslations } from "next-intl/server";
import { paths, site, type App, type Locale } from "./config";
import { externalLink, link, mailLink, type Section } from "./doc";
import { listFormat, periodFormat } from "./format";

export interface AppPolicy {
  /** "In short" bullets. */
  summary: string[];
  sections: Section[];
}

export async function buildAppPolicy(app: App, locale: Locale): Promise<AppPolicy> {
  const t = await getTranslations({ locale, namespace: "policy" });
  const te = await getTranslations({ locale, namespace: "enums" });
  const tu = await getTranslations({ locale, namespace: "units" });

  const p = app.practices;
  const server = p.storage === "server";
  const hasSdks = p.sdks.length > 0;
  const thirdParties = hasSdks || p.ads !== false;
  const list = (items: string[]) => listFormat(locale, items);
  const values = { app: app.name, developer: site.developerName, country: site.country, email: site.contactEmail };
  const mail = { mail: mailLink(site.contactEmail) };

  // --- In short ---
  const summary = [
    server ? t("short.server") : t("short.deviceOnly"),
    p.hasAccount ? t("short.account") : t("short.noAccount"),
    p.ads ? t("short.ads") : t("short.noAds"),
    p.payments ? t("short.payments") : t("short.noPayments"),
    hasSdks ? t("short.sdks", { list: list(p.sdks) }) : t("short.noSdks"),
  ];

  const sections: Section[] = [];
  const add = (id: string, heading: string, blocks: Section["blocks"]) => sections.push({ id, heading, blocks });

  add("who", t("who.heading"), [
    { kind: "p", content: t.rich("who.body", { ...values, site: site.websiteUrl, ...mail, web: externalLink(site.websiteUrl) }) },
  ]);

  // --- Information handled ---
  const collect: Section["blocks"] = [];
  if (!server) {
    // third parties (SDKs, ads, Google Play purchases) handle some information on their own,
    // so the "nothing leaves the device" wording is only used when none are involved
    const key = thirdParties || p.payments ? "collect.deviceOnlyServices" : "collect.deviceOnly";
    collect.push({ kind: "p", content: t(key, { app: app.name }) });
    collect.push({ kind: "p", content: t("collect.deviceBackup") });
  } else {
    if (p.hasAccount) {
      collect.push({ kind: "p", content: t("collect.account", { list: list(p.identifiers.map((id) => te(`identifier.${id}`))) }) });
    }
    collect.push({ kind: "p", content: t("collect.server", { list: list(p.serverData.map((c) => te(`dataCategory.${c}`))) }) });
    collect.push({ kind: "p", content: t("collect.serverUse") });
  }
  add("collect", t("collect.heading"), collect);

  // --- Third-party services ---
  add("services", t("services.heading"), [
    { kind: "p", content: hasSdks ? t("services.sdks", { list: list(p.sdks) }) : t("services.noSdks") },
    { kind: "p", content: t("services.play") },
  ]);

  // --- Ads ---
  add(
    "ads",
    t("ads.heading"),
    p.ads
      ? [
          { kind: "p", content: t("ads.on", { list: list(p.ads.networks) }) },
          { kind: "p", content: t("ads.onChoice") },
        ]
      : [{ kind: "p", content: t("ads.off") }],
  );

  // --- Purchases ---
  add("purchases", t("purchases.heading"), [{ kind: "p", content: p.payments ? t("purchases.on") : t("purchases.off") }]);

  // --- Permissions ---
  add(
    "permissions",
    t("permissions.heading"),
    p.permissions.length > 0
      ? [
          { kind: "p", content: t("permissions.on") },
          {
            kind: "ul",
            items: p.permissions.map((perm) =>
              t("permissions.item", {
                label: perm.id === "other" ? (perm.label ?? "") : te(`permission.${perm.id}`),
                purpose: perm.purpose[locale],
              }),
            ),
          },
        ]
      : [{ kind: "p", content: t("permissions.off") }],
  );

  // --- Sharing ---
  const shares = server || hasSdks || p.ads !== false || p.payments;
  add("sharing", t("sharing.heading"), [{ kind: "p", content: shares ? t("sharing.some") : t("sharing.none") }]);

  // --- Retention ---
  const retention: Section["blocks"] = [];
  if (!server) retention.push({ kind: "p", content: t("retention.deviceOnly") });
  else if (p.retention.kind === "days-after-last-use") {
    retention.push({ kind: "p", content: t("retention.afterLastUse", { period: periodFormat(p.retention.days, tu) }) });
  } else {
    retention.push({ kind: "p", content: p.hasAccount ? t("retention.untilDeletedAccount") : t("retention.untilDeleted") });
  }
  if (thirdParties) retention.push({ kind: "p", content: t("retention.thirdParty") });
  add("retention", t("retention.heading"), retention);

  // --- Choices and deletion ---
  const choices: Section["blocks"] = [];
  if (p.hasAccount) {
    choices.push({ kind: "p", content: t.rich("choices.deleteAccount", { delete: link(paths.appDelete(locale, app.id)) }) });
  } else if (server) {
    choices.push({ kind: "p", content: t.rich("choices.deleteServer", { ...values, ...mail }) });
  } else {
    choices.push({ kind: "p", content: t("choices.deleteDevice") });
  }
  choices.push({ kind: "p", content: t.rich(server ? "choices.rights" : "choices.question", { ...values, ...mail }) });
  add("choices", t("choices.heading"), choices);

  // --- Security (only when we hold data) ---
  if (server) add("security", t("security.heading"), [{ kind: "p", content: t("security.body") }]);

  add("changes", t("changes.heading"), [{ kind: "p", content: t("changes.body") }]);
  add("contact", t("contact.heading"), [{ kind: "p", content: t.rich("contact.body", { ...values, ...mail }) }]);

  return { summary, sections };
}
