// A tiny document model shared by every generated page: the builders in
// lib/policy.tsx, lib/website-policy.tsx and lib/delete-page.tsx produce it,
// components/Doc.tsx renders it.
import type { ReactNode } from "react";

export type Block =
  | { kind: "p"; content: ReactNode }
  | { kind: "ul" | "ol"; items: ReactNode[] }
  | { kind: "h3"; text: string };

export interface Section {
  /** Anchor id, stable across languages. */
  id: string;
  heading: string;
  blocks: Block[];
}

/** Rich-text tag handlers used inside messages: <mail>…</mail>, <web>…</web> ... */
export function mailLink(email: string) {
  return function MailLink(chunks: ReactNode) {
    return <a href={`mailto:${email}`}>{chunks}</a>;
  };
}

export function link(href: string) {
  return function InternalLink(chunks: ReactNode) {
    return <a href={href}>{chunks}</a>;
  };
}

export function externalLink(href: string) {
  return function ExternalLink(chunks: ReactNode) {
    return (
      <a href={href} rel="noopener">
        {chunks}
      </a>
    );
  };
}
