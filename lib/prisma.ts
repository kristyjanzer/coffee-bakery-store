import { PrismaClient } from "@prisma/client";

// В деве Next.js пересобирает модули при каждом hot-reload — без кэша в globalThis
// каждый reload создавал бы новый PrismaClient и новый пул соединений к БД,
// пока не исчерпается лимит подключений у Neon/Supabase.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
