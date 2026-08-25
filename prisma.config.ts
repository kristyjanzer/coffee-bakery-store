import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // CLI (migrate/generate/db seed) всегда ходит через прямое соединение — пуллер
  // (DATABASE_URL, его использует рантайм-клиент) не поддерживает Schema Engine.
  // process.env вместо env(): `prisma generate` (CI, postinstall) не должен падать
  // из-за отсутствия DIRECT_URL — она нужна только миграциям/сиду, не генерации клиента.
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
