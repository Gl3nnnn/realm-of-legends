import { defineConfig } from "@playwright/test";

const channel = process.env.PLAYWRIGHT_CHANNEL as "chrome" | "msedge" | "chromium" | undefined;

export default defineConfig({
  testDir: "./e2e",
  // Some tests take close to a minute, so each one gets two minutes.
  timeout: 120_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  // Two browsers at once made the slow story tests hit their time limit here, so run them one at a time.
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4174",
    headless: true,
    channel,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
