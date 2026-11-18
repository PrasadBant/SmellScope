import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: path.resolve(__dirname, "e2e"),
  testMatch: /.*\.spec\.ts$/,
  timeout: 90000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:8000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "python -m uvicorn smellscope.server.main:app --host 127.0.0.1 --port 8000",
    cwd: path.resolve(__dirname, ".."),
    url: "http://127.0.0.1:8000/api/v1/health",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
