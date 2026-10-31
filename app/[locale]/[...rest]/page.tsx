import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NotFoundView } from "@/components/NotFoundView";
import { paths, type Locale } from "@/lib/config";
import { pageMetadata, withStudio } from "@/lib/metadata";

// Emits out/{locale}/404.html. netlify.toml serves it with HTTP 404 for any
// unknown path under /{locale}/ (real files win, so real pages are not shadowed).
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ rest: ["404"] }];
}

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "notFound" });
  return pageMetadata({ locale, pathFor: paths.home, title: withStudio(t("title")), description: t("body"), noindex: true });
}

export default async function LocalizedNotFound({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <NotFoundView locale={locale} />;
}
