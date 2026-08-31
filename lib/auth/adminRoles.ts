// Роли админки и их подписи — чистые константы, без импорта Prisma.
// Вынесены из lib/server/settings.ts, потому что тот импортирует @/lib/prisma
// (@prisma/adapter-pg → pg → node:fs), а клиентский AdminUsersManager.tsx тянет
// ADMIN_ROLES/ADMIN_ROLE_LABELS как рантайм-значения — из-за чего Prisma-рантайм
// попадал в клиентский вебпак-бандл и /pekarnya-control/settings падал с
// "Module not found: Can't resolve 'fs'". Та же причина и то же решение, что у
// lib/shared/orderStatus.ts (константы статусов заказа отдельно от lib/api-client/orders.ts).
import type { AdminRole } from "@/types/next-auth";

export type { AdminRole };

// Порядок и формулировки — из about-project.md, раздел "Настройки"
// ("администратор, менеджер заказов").
export const ADMIN_ROLES: AdminRole[] = ["ADMIN", "ORDER_MANAGER"];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  ADMIN: "Администратор",
  ORDER_MANAGER: "Менеджер заказов",
};

// Запись пользователя админки для списка/формы — без passwordHash.
export interface AdminUserRecord {
  id: number;
  email: string;
  role: AdminRole;
}
