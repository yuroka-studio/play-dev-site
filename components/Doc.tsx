import { getTranslations } from "next-intl/server";
import { paths, site, type Locale } from "@/lib/config";
import type { Block, Section } from "@/lib/doc";
import { dateFormat } from "@/lib/format";

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "p":
            return <p key={i}>{b.content}</p>;
          case "h3":
            return <h3 key={i}>{b.text}</h3>;
          case "ul":
            return (
              <ul key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ol>
            );
        }
      })}
    </>
  );
}

/** A legal page: title block, template note, "in short" box and numbered-free sections. */
export async function Doc({
  locale,
  eyebrow,
  title,
  intro,
  summary,
  sections,
  after,
}: {
  locale: Locale;
  eyebrow: string;
  title: string;
  /** One or two sentences under the title. */
  intro?: string;
  summary?: string[];
  sections: Section[];
  after?: Block[];
}) {
  const t = await getTranslations({ locale, namespace: "legal" });
  const ta = await getTranslations({ locale, namespace: "a11y" });
  return (
    <div className="wrap doc">
      <p className="crumb">
        <a href={paths.home(locale)}>
          <span className="arrow" aria-hidden="true">←</span>
          {ta("tocBack", { studio: site.studioName })}
        </a>
      </p>
      <header className="doc-head">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="meta">{t("updated", { date: dateFormat(locale, site.policyLastUpdated) })}</p>
        {intro ? <p className="lede">{intro}</p> : null}
      </header>

      <div className="notice" role="note" data-testid="template-notice">
        <strong>{t("templateNoticeLabel")}.</strong> {t("templateNotice")}
      </div>

      {summary && summary.length > 0 ? (
        <section className="short" aria-labelledby="in-short">
          <h2 id="in-short">{t("inShort")}</h2>
          <ul>
            {summary.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.map((s) => (
        <section key={s.id} aria-labelledby={`h-${s.id}`}>
          <h2 id={`h-${s.id}`}>{s.heading}</h2>
          <Blocks blocks={s.blocks} />
        </section>
      ))}
      {after ? <Blocks blocks={after} /> : null}
    </div>
  );
}
