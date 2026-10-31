// Builds the account and data deletion page of one app (apps with accounts only).
import { getTranslations } from "next-intl/server";
import { paths, site, type App, type Locale } from "./config";
import { link, mailLink, type Block, type Section } from "./doc";
import { listFormat, periodFormat } from "./format";

export async function buildDeletePage(app: App, locale: Locale): Promise<{ sections: Section[]; after: Block[] }> {
  const p = app.practices;
  if (!p.hasAccount) throw new Error(`${app.id} has no accounts, so it has no delete-account page.`);

  const t = await getTranslations({ locale, namespace: "deletePage" });
  const te = await getTranslations({ locale, namespace: "enums" });
  const tu = await getTranslations({ locale, namespace: "units" });
  const list = (items: string[]) => listFormat(locale, items);
  const d = p.deletion;
  const email = site.contactEmail;

  const subject = t("mailSubject", { app: app.name });
  const body = t("mailBody", { app: app.name });
  const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // --- How ---
  const how: Section["blocks"] = [];
  const inApp = d.inAppSteps?.[locale];
  if (inApp?.length) {
    how.push({ kind: "h3", text: t("how.inApp") });
    how.push({ kind: "ol", items: inApp });
    how.push({ kind: "h3", text: t("how.byEmail") });
  }
  how.push({ kind: "p", content: t.rich("how.emailBody", { email, subject, mail: mailLink(email), request: link(mailto) }) });
  how.push({ kind: "p", content: t("how.verify") });
  how.push({ kind: "p", content: t("how.time", { period: periodFormat(d.processingDays, tu) }) });
  if (d.partialDeletion) how.push({ kind: "p", content: t("how.partial") });

  // --- Deleted ---
  const deleted = [
    t("deleted.identifiers", { list: list(p.identifiers.map((id) => te(`identifier.${id}`))) }),
    ...(p.serverData.length > 0 ? [t("deleted.data", { list: list(p.serverData.map((c) => te(`dataCategory.${c}`))) })] : []),
  ];

  // --- Kept ---
  const kept: Section["blocks"] = [];
  if (d.kept.length > 0) {
    kept.push({ kind: "p", content: t("kept.intro") });
    kept.push({
      kind: "ul",
      items: d.kept.map((k) => t("kept.item", { what: k.what[locale], why: k.why[locale], period: periodFormat(k.days, tu) })),
    });
  } else if (d.backupDays === undefined) {
    kept.push({ kind: "p", content: t("kept.none") });
  }
  if (d.backupDays !== undefined) kept.push({ kind: "p", content: t("kept.backups", { period: periodFormat(d.backupDays, tu) }) });
  if (p.payments) kept.push({ kind: "p", content: t("kept.play") });
  if (p.sdks.length > 0 || p.ads !== false) kept.push({ kind: "p", content: t("kept.third") });

  return {
    sections: [
      { id: "how", heading: t("how.heading"), blocks: how },
      { id: "deleted", heading: t("deleted.heading"), blocks: [{ kind: "p", content: t("deleted.intro") }, { kind: "ul", items: deleted }] },
      { id: "kept", heading: t("kept.heading"), blocks: kept },
      { id: "device", heading: t("device.heading"), blocks: [{ kind: "p", content: t("device.body") }] },
    ],
    after: [{ kind: "p", content: t.rich("more", { app: app.name, policy: link(paths.appPrivacy(locale, app.id)) }) }],
  };
}
