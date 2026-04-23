import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:3099",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm build && pnpm start -p 3099",
    port: 3099,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: { viewport: { width: 375, height: 812 } },
    },
  ],
});
