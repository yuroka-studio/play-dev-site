// Builds the privacy policy of the website itself: no cookies, no analytics,
// only the access logs every web host keeps.
import { getTranslations } from "next-intl/server";
import { apps, paths, site, type Locale } from "./config";
import { externalLink, mailLink, type Section } from "./doc";

export async function buildWebsitePolicy(locale: Locale): Promise<{ summary: string[]; sections: Section[] }> {
  const t = await getTranslations({ locale, namespace: "websitePolicy" });
  const host = site.hosting.name;
  const values = { developer: site.developerName, studio: site.studioName, country: site.country, email: site.contactEmail, host };
  const mail = { mail: mailLink(site.contactEmail) };

  const summary = [t("short.noCookies"), t("short.noTracking"), t("short.logs", { host }), t("short.noEmbeds")];

  const logs = site.hosting.privacyUrl
    ? t.rich("collect.logs", { host, hostlink: externalLink(site.hosting.privacyUrl) })
    : t("collect.logsPlain", { host });

  const sections: Section[] = [
    { id: "who", heading: t("who.heading"), blocks: [{ kind: "p", content: t.rich("who.body", { ...values, ...mail }) }] },
    {
      id: "collect",
      heading: t("collect.heading"),
      blocks: [{ kind: "ul", items: [t("collect.forms"), logs, t("collect.email")] }],
    },
    {
      id: "none",
      heading: t("none.heading"),
      blocks: [{ kind: "ul", items: [t("none.cookies"), t("none.analytics"), t("none.ads"), t("none.embeds")] }],
    },
    { id: "links", heading: t("links.heading"), blocks: [{ kind: "p", content: t("links.body") }] },
    {
      id: "apps",
      heading: t("apps.heading"),
      blocks:
        apps.length === 0
          ? [{ kind: "p", content: t("apps.none") }]
          : [
              { kind: "p", content: t("apps.body") },
              {
                kind: "ul",
                items: apps.map((a) => <a key={a.id} href={paths.appPrivacy(locale, a.id)}>{t("apps.item", { app: a.name })}</a>),
              },
            ],
    },
    { id: "choices", heading: t("choices.heading"), blocks: [{ kind: "p", content: t.rich("choices.body", { ...values, ...mail }) }] },
    { id: "changes", heading: t("changes.heading"), blocks: [{ kind: "p", content: t("changes.body") }] },
    { id: "contact", heading: t("contact.heading"), blocks: [{ kind: "p", content: t.rich("contact.body", { ...values, ...mail }) }] },
  ];
  return { summary, sections };
}
