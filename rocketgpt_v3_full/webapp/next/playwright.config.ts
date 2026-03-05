import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },
  fullyParallel: true,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: process.env.PLAYWRIGHT_HTML_REPORT || "playwright-report" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    env: {
      RGPT_SAFE_MODE: "1",
      CATS_INMEMORY: "1",
      NEXT_PUBLIC_DEMO_TENANT_ID: "00000000-0000-4000-8000-000000000001",
      NEXT_PUBLIC_DEMO_USER_ID: "00000000-0000-4000-8000-000000000002",
      ...process.env,
    },
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});


