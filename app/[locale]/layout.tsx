import "../globals.css";
import type { ReactNode } from "react";
import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { RootDocument } from "@/components/RootDocument";
import { site } from "@/lib/config";
import { routing } from "@/i18n/routing";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: site.accentColor, colorScheme: "light" };

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <RootDocument locale={locale}>{children}</RootDocument>;
}
