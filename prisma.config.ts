import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // CLI (migrate/generate/db seed) всегда ходит через прямое соединение — пуллер
  // (DATABASE_URL, его использует рантайм-клиент) не поддерживает Schema Engine.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
