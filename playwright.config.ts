import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // В CI дополнительно пишем html-отчёт на диск (playwright-report/) — сам workflow
  // (.github/workflows/ci.yml) прикладывает его как артефакт для отладки упавшего прогона.
  // Локально — только компактный list-вывод в терминал.
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Настроен под dev-сервер на порту 3000 (.agents/rules/server.md): если он уже
  // поднят локально — Playwright переиспользует его, иначе поднимет сам и погасит
  // после прогона, без висящих фоновых процессов.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
