import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";
export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: false,
  },
});
