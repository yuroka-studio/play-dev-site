import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { locales, noAccountApps } from "./helpers";

// scripts/postbuild.mjs on throw-away copies of out/: it must be idempotent,
// write the host files, and notice missing or unexpected pages.

const root = process.cwd();
const out = path.join(root, "out");

function withCopy<T>(fn: (dir: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "postbuild-"));
  try {
    fs.cpSync(out, dir, { recursive: true });
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function postbuild(dir: string, env: Record<string, string> = {}) {
  const r = spawnSync("node", [path.join(root, "scripts", "postbuild.mjs"), "--dir", dir], {
    env: { ...process.env, ALLOW_EXAMPLE: "1", CF_PAGES: "", DEPLOY_TARGET: "", ...env },
    encoding: "utf8",
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

test.skip(!fs.existsSync(out), "build first");

test("is idempotent and writes the language chooser and .nojekyll", () => {
  withCopy((dir) => {
    expect(postbuild(dir).code).toBe(0);
    expect(postbuild(dir).code).toBe(0);
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    for (const l of locales) expect(html).toContain(`href="/${l}"`);
    expect(html).not.toMatch(/http-equiv="refresh"/i);
    expect(fs.existsSync(path.join(dir, ".nojekyll"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "_headers"))).toBe(false);
  });
});

test("writes _headers from netlify.toml for Cloudflare Pages only", () => {
  withCopy((dir) => {
    expect(postbuild(dir, { CF_PAGES: "1" }).code).toBe(0);
    const headers = fs.readFileSync(path.join(dir, "_headers"), "utf8");
    expect(headers).toContain("Content-Security-Policy: default-src 'self'");
    expect(headers).toContain("/_next/static/*");
  });
});

test("fails when a page the config implies is missing", () => {
  withCopy((dir) => {
    fs.rmSync(path.join(dir, locales[0], "privacy.html"));
    const r = postbuild(dir);
    expect(r.code).toBe(1);
    expect(r.out).toContain(`missing page: ${locales[0]}/privacy.html`);
  });
});

test("fails when an app without accounts has a delete-account page", () => {
  test.skip(noAccountApps.length === 0, "every app has accounts");
  withCopy((dir) => {
    const app = noAccountApps[0];
    const file = path.join(dir, locales[0], "apps", app.id, "delete-account.html");
    fs.writeFileSync(file, "<p>x</p>");
    const r = postbuild(dir);
    expect(r.code).toBe(1);
    expect(r.out).toContain(`unexpected delete-account page for ${app.id}`);
  });
});
