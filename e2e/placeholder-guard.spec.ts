import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";

// The build must refuse to ship values from the example config. These tests
// run the real guard on small throw-away folders, so they do not depend on
// what your site.config.ts says.

const script = path.join(process.cwd(), "scripts", "check-placeholders.mjs");

function run(files: Record<string, string>, env: Record<string, string> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guard-"));
  try {
    for (const [name, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      fs.writeFileSync(path.join(dir, name), content);
    }
    const base = { ...process.env, ALLOW_EXAMPLE: "" };
    const r = spawnSync("node", [script, "--dir", dir], { env: { ...base, ...env }, encoding: "utf8" });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const CLEAN = { "en.html": "<main><h1>Acme Apps</h1><p>hello@acme.dev</p></main>" };
const EXAMPLES = [
  "Example Studio",
  "Exampleland",
  "hello@example.com",
  "https://example.com/en",
  "Lantern Notes",
  "lantern-notes",
  "Pixel Garden",
  "Tide Table",
];

test("a clean build passes", () => {
  const r = run(CLEAN);
  expect(r.code).toBe(0);
});

for (const marker of EXAMPLES) {
  test(`example value "${marker}" fails the build with a clear message`, () => {
    const r = run({ "en/privacy.html": `<p>${marker}</p>` });
    expect(r.code).toBe(1);
    expect(r.out).toContain("example site.config.ts");
    expect(r.out).toContain("ALLOW_EXAMPLE=1");
    expect(r.out).toContain("en/privacy.html");
  });
}

test("ALLOW_EXAMPLE=1 lets example values through with a warning", () => {
  const r = run({ "en.html": "<p>Example Studio</p>" }, { ALLOW_EXAMPLE: "1" });
  expect(r.code).toBe(0);
  expect(r.out).toContain("Never deploy this build");
});

test("ALLOW_EXAMPLE does not bypass the tracker check", () => {
  const r = run({ "en.html": '<script src="https://www.googletagmanager.com/gtag/js"></script>' }, { ALLOW_EXAMPLE: "1" });
  expect(r.code).toBe(1);
  expect(r.out).toContain("another site");
});

test("a build with an iframe embed fails", () => {
  const r = run({ "en.html": '<iframe src="https://video.example.net/x"></iframe>' });
  expect(r.code).toBe(1);
});

test("the shipped site.config.ts is either still the example (guard trips) or already yours (guard passes)", () => {
  const out = path.join(process.cwd(), "out");
  test.skip(!fs.existsSync(out), "build first");
  const r = spawnSync("node", [script, "--dir", out], { env: { ...process.env, ALLOW_EXAMPLE: "" }, encoding: "utf8" });
  const config = fs.readFileSync(path.join(process.cwd(), "site.config.ts"), "utf8");
  const stillExample = /studioName:\s*"Example Studio"/.test(config);
  expect(r.status).toBe(stillExample ? 1 : 0);
});
