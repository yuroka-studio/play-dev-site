// Builds and tests the template as shipped, example values and all:
//   npm run test:example
//
// `npm test` stops at the placeholder guard while site.config.ts still holds
// the example studio (that is the guard doing its job). This command sets
// ALLOW_EXAMPLE=1 for you, the same way CI does, in every shell, Windows
// included, and then runs `npm run build` and `npm run test:e2e`. It deploys
// nothing, and the build it leaves in out/ is not safe to publish.
import { spawnSync } from "node:child_process";

const env = { ...process.env, ALLOW_EXAMPLE: "1" };
// npm sets npm_execpath to its own script, which avoids a shell on Windows.
const npm = process.env.npm_execpath;

for (const script of ["build", "test:e2e"]) {
  const r = npm
    ? spawnSync(process.execPath, [npm, "run", script], { stdio: "inherit", env })
    : spawnSync("npm", ["run", script], { stdio: "inherit", env, shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
