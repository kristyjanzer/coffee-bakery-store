import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // Локально — один воркер: все спеки бьют по одному dev-серверу, который
  // компилирует роуты по первому обращению. Параллельные воркеры устраивают гонку
  // компиляции (вплоть до "__webpack_modules__[moduleId] is not a function" от
  // Turbopack/webpack HMR), а без retries локально это сразу красный прогон.
  // В CI воркеры по умолчанию + retries: 2 — там гонка компиляции переживается.
  workers: process.env.CI ? undefined : 1,
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
