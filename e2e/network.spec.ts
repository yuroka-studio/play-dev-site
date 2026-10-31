import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";

// The template promises no network calls of its own while you build or edit it
// and no listener open to your network. These tests keep the switches that
// make that true from being removed by accident (or by a Next.js upgrade that
// changes a default).

const root = process.cwd();

/** The environment a fresh machine would have: no Next.js switches set, no saved telemetry choice. */
function cleanEnv(home: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: path.join(home, ".config"),
    APPDATA: path.join(home, "AppData", "Roaming"),
    LOCALAPPDATA: path.join(home, "AppData", "Local"),
  };
  delete env.NEXT_TELEMETRY_DISABLED;
  // Playwright forces colours on in its workers; plain text is easier to match
  delete env.FORCE_COLOR;
  env.NO_COLOR = "1";
  return env;
}

test("next.config.ts turns off the npm security-advisory check and telemetry", () => {
  // Next.js 16 asks registry.npmjs.org for advisories during `next build` and
  // `next dev` (in a terminal or under an AI coding agent) unless this is false.
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "next-home-"));
  try {
    const script = `
      const { createRequire } = require("node:module");
      const req = createRequire(process.cwd() + "/");
      const { PHASE_PRODUCTION_BUILD } = req("next/constants");
      const loadConfig = req("next/dist/server/config").default;
      loadConfig(PHASE_PRODUCTION_BUILD, process.cwd()).then((c) => {
        console.log(JSON.stringify({ agentUpgrade: c.experimental.agentUpgrade, telemetry: process.env.NEXT_TELEMETRY_DISABLED }));
      });
    `;
    const r = spawnSync(process.execPath, ["-e", script], { cwd: root, env: cleanEnv(home), encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    const resolved = JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}");
    expect(resolved.agentUpgrade).toBe(false);
    expect(resolved.telemetry).toBe("1");
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test(".npmrc switches off npm's own update check, which would otherwise call the registry on every npm run", () => {
  const npmrc = fs.readFileSync(path.join(root, ".npmrc"), "utf8");
  expect(npmrc).toMatch(/^update-notifier\s*=\s*false\s*$/m);
});

test("npm run dev and npm run build start Next.js through the wrapper that disables telemetry", () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts;
  expect(scripts.dev).toBe("node scripts/next.mjs dev");
  expect(scripts.build).toMatch(/^node scripts\/next\.mjs build\b/);
});

test("scripts/next.mjs runs Next.js with telemetry disabled, even in a shell that did not set it", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "next-home-"));
  try {
    const r = spawnSync(process.execPath, [path.join(root, "scripts", "next.mjs"), "telemetry", "status"], {
      cwd: root,
      env: cleanEnv(home),
      encoding: "utf8",
    });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("Status: Disabled");
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("scripts/next.mjs passes on the exit code of Next.js", () => {
  const r = spawnSync(process.execPath, [path.join(root, "scripts", "next.mjs"), "no-such-command"], { cwd: root, encoding: "utf8" });
  expect(r.status).not.toBe(0);
});

async function freePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address() as net.AddressInfo;
      s.close(() => resolve(port));
    });
  });
}

/** Resolves with "open" or the error code ("ECONNREFUSED", "ETIMEDOUT" ...). */
async function probe(host: string, port: number): Promise<string> {
  return await new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: 2000 });
    socket.once("connect", () => {
      socket.destroy();
      resolve("open");
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve("ETIMEDOUT");
    });
    socket.once("error", (e: NodeJS.ErrnoException) => resolve(e.code ?? String(e)));
  });
}

async function withServer(args: string[], fn: (port: number) => Promise<void>) {
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(root, "scripts", "serve.mjs"), "--port", String(port), ...args], { cwd: root });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("serve.mjs did not start")), 10_000);
      child.once("error", reject);
      child.stdout.on("data", (chunk) => {
        if (!String(chunk).includes("serving")) return;
        clearTimeout(timer);
        resolve();
      });
    });
    await fn(port);
  } finally {
    child.kill();
  }
}

const lanAddress = Object.values(os.networkInterfaces())
  .flat()
  .find((i) => i && i.family === "IPv4" && !i.internal)?.address;

test("npm start listens on this computer only", async () => {
  test.skip(!lanAddress, "this machine has no network address besides loopback");
  await withServer([], async (port) => {
    expect(await probe("127.0.0.1", port)).toBe("open");
    expect(await probe(lanAddress!, port)).not.toBe("open");
  });
});

test("serve.mjs opens to the network only when --host says so", async () => {
  test.skip(!lanAddress, "this machine has no network address besides loopback");
  await withServer(["--host", "0.0.0.0"], async (port) => {
    expect(await probe(lanAddress!, port)).toBe("open");
  });
});

test("serve.mjs and check-placeholders.mjs say what is wrong when a flag has no value", () => {
  const serve = spawnSync(process.execPath, [path.join(root, "scripts", "serve.mjs"), "--dir"], { cwd: root, encoding: "utf8" });
  expect(serve.status).toBe(1);
  expect(serve.stderr).toContain("--dir needs a value");
  expect(serve.stderr).not.toContain("TypeError");
  const check = spawnSync(process.execPath, [path.join(root, "scripts", "check-placeholders.mjs"), "--dir"], { cwd: root, encoding: "utf8" });
  expect(check.status).toBe(1);
  expect(check.stderr).toContain("--dir needs a folder");
  expect(check.stderr).not.toContain("TypeError");
});
