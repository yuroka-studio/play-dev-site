// Starts the Next.js CLI with its anonymous telemetry switched off:
//   node scripts/next.mjs dev      (what `npm run dev` runs)
//   node scripts/next.mjs build    (what `npm run build` runs)
//
// next.config.ts also sets NEXT_TELEMETRY_DISABLED, but `next dev` starts its
// CLI process (and prints its "Attention: Next.js now collects completely
// anonymous telemetry" notice) before any config file is read. Setting the
// variable here, ahead of Next.js, covers that and works in every shell,
// Windows included. Nothing is installed or fetched: it only starts the copy of
// Next.js in node_modules.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});

// Ctrl-C reaches the child through the terminal; pass explicit signals on too.
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => child.kill(signal));
child.on("error", (err) => {
  console.error(`next: could not start Next.js: ${err.message}`);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
