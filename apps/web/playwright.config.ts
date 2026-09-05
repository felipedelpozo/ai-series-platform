import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.UI_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [["list"], ["html", { open: "never" }]],
  preserveOutput: "always",
  use: {
    baseURL: externalBaseUrl ?? "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "bun run dev --hostname 127.0.0.1 --port 3100",
        url: "http://127.0.0.1:3100/series",
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
