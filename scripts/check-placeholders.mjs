// Runs the hygiene scan on its own: node scripts/check-placeholders.mjs [--dir out]
// Exit code 1 when example values or trackers are found (ALLOW_EXAMPLE=1 allows the former).
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { report, scan } from "./lib/hygiene.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const i = process.argv.indexOf("--dir");
if (i > -1 && !process.argv[i + 1]) {
  console.error("hygiene: --dir needs a folder, for example: node scripts/check-placeholders.mjs --dir out");
  process.exit(1);
}
const dir = path.resolve(root, i > -1 ? process.argv[i + 1] : "out");
if (!fs.existsSync(dir)) {
  console.error(`${dir} does not exist: run "npm run build" first.`);
  process.exit(1);
}
const result = scan(dir);
const ok = report(result, { allowExample: process.env.ALLOW_EXAMPLE === "1" });
if (ok) console.log(`hygiene: ${result.files} files scanned, nothing blocking`);
process.exit(ok ? 0 : 1);
