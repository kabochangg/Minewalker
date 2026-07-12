import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-390",
      use: {
        ...devices["Pixel 5"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "mobile-320",
      use: {
        ...devices["iPhone SE"],
        browserName: "chromium",
        viewport: { width: 320, height: 568 },
      },
    },
    {
      name: "mobile-428",
      use: {
        ...devices["Pixel 5"],
        browserName: "chromium",
        viewport: { width: 428, height: 926 },
      },
    },
  ],
});
