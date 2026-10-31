import { defineConfig, devices } from "@playwright/test";

// The suite runs against the static export (out/) served by scripts/serve.mjs,
// which applies netlify.toml (headers incl. CSP, redirects, 404 rules).
// Playwright starts the server on port 4100 and stops it when the run ends.
// Build first: `npm test` does both.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4100",
    trace: "retain-on-failure",
    locale: "en-US",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node scripts/serve.mjs --port 4100",
    url: "http://localhost:4100/robots.txt",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
