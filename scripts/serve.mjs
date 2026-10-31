// Tiny static server for out/ that applies netlify.toml the way Netlify does:
//   - [[headers]] (CSP, cache rules ...)
//   - [[redirects]] top to bottom, first match wins; rules without `force` are
//     shadowed by existing files; `Language` conditions use the first language
//     of Accept-Language; 3xx redirect, 200/404 rewrite; trailing slashes are
//     ignored when matching.
// Used by `npm start` and by the Playwright suite (port 4100). Production is
// your real host.
//
// It listens on this computer only (127.0.0.1), so a preview of the example
// site, or of a site you have not published yet, is not reachable from your
// network. Pass --host 0.0.0.0 to open it to the network on purpose.
//
// Usage: node scripts/serve.mjs [--port 4100] [--dir out] [--host 127.0.0.1]
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return def;
  if (!process.argv[i + 1]) {
    console.error(`serve: --${name} needs a value, for example: node scripts/serve.mjs --${name} ${def}`);
    process.exit(1);
  }
  return process.argv[i + 1];
};
const PORT = Number(arg("port", process.env.PORT ?? 4100));
const DIR = path.resolve(root, arg("dir", "out"));
const HOST = arg("host", "127.0.0.1");
const config = parse(fs.readFileSync(path.join(root, "netlify.toml"), "utf8"));
const redirects = config.redirects ?? [];
const headerRules = config.headers ?? [];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

const strip = (p) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);

/** Resolve a URL path to a file in DIR the way Netlify does (pretty URLs). */
function resolveFile(urlPath) {
  const clean = path.posix.normalize(urlPath);
  if (clean.includes("\0")) return null;
  const base = strip(clean);
  const candidates = [clean.endsWith("/") ? path.join(clean, "index.html") : clean, `${base}.html`, path.join(base, "index.html")];
  for (const c of candidates) {
    const abs = path.join(DIR, c);
    if (!abs.startsWith(DIR)) continue;
    try {
      if (fs.statSync(abs).isFile()) return abs;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/** Match a Netlify `from` pattern; returns the captured params or null. */
function match(from, urlPath) {
  const a = strip(from).split("/");
  const b = strip(urlPath).split("/");
  const params = {};
  for (let i = 0; i < a.length; i++) {
    const seg = a[i];
    if (seg === "*") {
      params.splat = b.slice(i).join("/");
      return params;
    }
    if (i >= b.length) return null;
    if (seg.startsWith(":")) params[seg.slice(1)] = b[i];
    else if (seg !== b[i]) return null;
  }
  return a.length === b.length ? params : null;
}

function firstLanguage(req) {
  const h = req.headers["accept-language"];
  if (!h) return null;
  return h.split(",")[0].trim().split(";")[0].split("-")[0].toLowerCase() || null;
}

function headersFor(urlPath) {
  const out = {};
  for (const rule of headerRules) {
    const re = new RegExp(`^${rule.for.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
    if (re.test(urlPath)) Object.assign(out, rule.values);
  }
  return out;
}

function send(req, res, file, status, urlPath) {
  const stat = fs.statSync(file);
  const type = TYPES[path.extname(file)] ?? "application/octet-stream";
  // a Content-Type from a netlify.toml [[headers]] rule wins, as on Netlify
  res.writeHead(status, { "Content-Type": type, ...headersFor(urlPath), "Content-Length": stat.size });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  const file = resolveFile(urlPath);
  const lang = firstLanguage(req);

  for (const r of redirects) {
    const params = match(r.from, urlPath);
    if (!params) continue;
    const langs = r.conditions?.Language;
    if (langs && !(lang && langs.map((l) => l.toLowerCase()).includes(lang))) continue;
    if (file && !r.force) continue; // shadowed by a real file
    let to = r.to;
    for (const [k, v] of Object.entries(params)) to = to.replace(k === "splat" ? ":splat" : `:${k}`, v);
    const status = r.status ?? 301;
    if ([301, 302, 303, 307, 308].includes(status)) {
      res.writeHead(status, { ...headersFor(urlPath), Location: to });
      return res.end();
    }
    const target = resolveFile(to);
    if (target) return send(req, res, target, status, urlPath);
  }

  if (file) return send(req, res, file, 200, urlPath);
  const notFound = path.join(DIR, "404.html");
  if (fs.existsSync(notFound)) return send(req, res, notFound, 404, urlPath);
  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, HOST, () => console.log(`serving ${path.relative(root, DIR)}/ on http://${HOST === "127.0.0.1" ? "localhost" : HOST}:${PORT}`));
