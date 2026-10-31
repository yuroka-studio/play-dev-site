import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { defaultLocale, legalLocales, locales, messages } from "./helpers";

// "Adding a language is just a new messages file": prove every file has the
// same keys and the same {placeholders} as the default language.

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  return Object.entries(value as Record<string, unknown>).reduce((acc, [k, v]) => ({ ...acc, ...flatten(v, prefix ? `${prefix}.${k}` : k) }), {});
}

const placeholders = (text: string) => [...new Set([...text.matchAll(/\{(\w+)[,}]|<(\w+)>/g)].map((m) => m[1] ?? m[2]))].sort();
const POLICY_SECTIONS = ["policy", "websitePolicy", "deletePage"];

test("every configured language has a messages file", () => {
  for (const l of locales) expect(fs.existsSync(path.join(process.cwd(), "messages", `${l}.json`)), `messages/${l}.json`).toBe(true);
});

for (const locale of locales.filter((l) => l !== defaultLocale)) {
  test(`${locale}: same keys and placeholders as ${defaultLocale}`, () => {
    const base = flatten(messages(defaultLocale));
    const own = flatten(messages(locale));
    // a language outside legalLocales may leave the policy sections out
    const needed = (key: string) => legalLocales.includes(locale) || !POLICY_SECTIONS.includes(key.split(".")[0]);
    const missing = Object.keys(base).filter((k) => needed(k) && !(k in own));
    const extra = Object.keys(own).filter((k) => !(k in base));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    const mismatched = Object.keys(own)
      .filter((k) => k in base && placeholders(own[k]).join() !== placeholders(base[k]).join())
      .map((k) => `${k}: ${placeholders(base[k])} vs ${placeholders(own[k])}`);
    expect(mismatched).toEqual([]);
  });
}
