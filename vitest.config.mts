import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    // Только unit/component-тесты (*.test.ts(x)) — e2e/*.spec.ts запускается
    // отдельно через Playwright (npm run test:e2e), не через Vitest.
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});
