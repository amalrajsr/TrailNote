import { defineConfig, devices } from "@playwright/test";

const externalServer = process.env.PLAYWRIGHT_BASE_URL;
const localUrl = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: externalServer ?? localUrl,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: externalServer
    ? undefined
    : {
        command: "corepack pnpm test:e2e:serve",
        url: localUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
