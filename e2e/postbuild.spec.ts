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

test("removes the placeholder page Next.js needs for a route with no pages", () => {
  withCopy((dir) => {
    const placeholder = path.join(dir, locales[0], "apps", "_unused");
    fs.mkdirSync(placeholder, { recursive: true });
    fs.writeFileSync(path.join(placeholder, "delete-account.html"), "<p>404</p>");
    expect(postbuild(dir).code).toBe(0);
    expect(fs.existsSync(placeholder)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// postbuild writes, deletes and prunes files, so it must only ever do that to
// a Next.js export, and it must not leave a failed build lying around.

/** Every file under dir with its content, to prove that nothing changed. */
function snapshot(dir: string): Record<string, string> {
  const files: Record<string, string> = {};
  (function walk(d: string) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = path.relative(dir, p).split(path.sep).join("/");
      if (e.isDirectory()) {
        files[`${rel}/`] = "";
        walk(p);
      } else files[rel] = fs.readFileSync(p, "utf8");
    }
  })(dir);
  return files;
}

test("refuses a folder that is not a Next.js export and leaves it untouched", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "not-an-export-"));
  try {
    fs.writeFileSync(path.join(dir, "index.html"), "MY ORIGINAL HOMEPAGE");
    fs.mkdirSync(path.join(dir, "notes", "archive"), { recursive: true });
    fs.writeFileSync(path.join(dir, "notes", "todo.txt"), "keep me");
    fs.writeFileSync(path.join(dir, "notes", "archive", "log.txt"), "keep me too");
    fs.writeFileSync(path.join(dir, "readme.txt"), "and me");
    fs.mkdirSync(path.join(dir, "emptydir"));
    fs.mkdirSync(path.join(dir, "en", "apps", "_unused"), { recursive: true });
    fs.writeFileSync(path.join(dir, "en", "apps", "_unused", "a.html"), "<p>a</p>");
    const before = snapshot(dir);

    const r = postbuild(dir);
    expect(r.code).toBe(1);
    expect(r.out).toContain("not a Next.js static export");
    expect(r.out).toContain("Nothing was changed");
    expect(snapshot(dir)).toEqual(before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("explains a --dir flag that has no folder after it", () => {
  const r = spawnSync("node", [path.join(root, "scripts", "postbuild.mjs"), "--dir"], { encoding: "utf8" });
  expect(r.status).toBe(1);
  expect(`${r.stdout}${r.stderr}`).toContain("--dir needs a folder");
  expect(`${r.stdout}${r.stderr}`).not.toContain("TypeError");
});

test("deletes the build folder when a page is missing, so it cannot be deployed", () => {
  withCopy((dir) => {
    fs.rmSync(path.join(dir, locales[0], "privacy.html"));
    const r = postbuild(dir);
    expect(r.code).toBe(1);
    expect(r.out).toContain("so this build cannot be deployed");
    expect(fs.existsSync(dir)).toBe(false);
  });
});

test("deletes the build folder when the hygiene gate fails, even with ALLOW_EXAMPLE=1", () => {
  withCopy((dir) => {
    fs.appendFileSync(path.join(dir, `${locales[0]}.html`), '<script src="https://www.googletagmanager.com/gtag/js"></script>');
    const r = postbuild(dir);
    expect(r.code).toBe(1);
    expect(r.out).toContain("hygiene gate");
    expect(fs.existsSync(dir)).toBe(false);
  });
});

test("keeps .txt files of your own and removes only the Next.js payloads", () => {
  withCopy((dir) => {
    fs.writeFileSync(path.join(dir, "ads.txt"), "mine");
    fs.mkdirSync(path.join(dir, ".well-known"));
    fs.writeFileSync(path.join(dir, ".well-known", "security.txt"), "mine too");
    // the two shapes Next.js writes: "<page>.txt" beside "<page>.html", and "__next.*.txt" in the page folder
    fs.writeFileSync(path.join(dir, `${locales[0]}.txt`), "payload");
    fs.mkdirSync(path.join(dir, locales[0], "privacy"), { recursive: true });
    fs.writeFileSync(path.join(dir, locales[0], "privacy", "__next._tree.txt"), "payload");
    expect(postbuild(dir).code).toBe(0);
    expect(fs.readFileSync(path.join(dir, "ads.txt"), "utf8")).toBe("mine");
    expect(fs.readFileSync(path.join(dir, ".well-known", "security.txt"), "utf8")).toBe("mine too");
    expect(fs.existsSync(path.join(dir, "robots.txt"))).toBe(true);
    expect(fs.existsSync(path.join(dir, `${locales[0]}.txt`))).toBe(false);
    expect(fs.existsSync(path.join(dir, locales[0], "privacy", "__next._tree.txt"))).toBe(false);
  });
});
