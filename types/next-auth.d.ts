import type { DefaultSession } from "next-auth";

// Совпадает с enum AdminRole в prisma/schema.prisma — не импортируем сам
// сгенерированный Prisma-тип здесь, чтобы модуль типов не тянул за собой рантайм
// Prisma-клиента только ради строкового объединения.
export type AdminRole = "ADMIN" | "ORDER_MANAGER";

// Добавляет role в User/Session/JWT NextAuth (docs/plan.md, пункт 31) — без этого
// getServerSession(authOptions).user.role не типизировался бы (TypeScript strict).
declare module "next-auth" {
  interface User {
    role: AdminRole;
  }

  interface Session {
    user: {
      role: AdminRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: AdminRole;
  }
}
