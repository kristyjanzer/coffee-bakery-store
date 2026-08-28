import { z } from "zod";

// Валидация тела запросов /api/admin-users (docs/plan.md, пункт 21). Роли —
// строго из enum AdminRole в prisma/schema.prisma. Пароль ≥ 8 символов (тот же
// минимум, что для входа в админку) — bcrypt-хэш кладётся в БД уже в lib/settings.ts.
export const ADMIN_ROLE_VALUES = ["ADMIN", "ORDER_MANAGER"] as const;

export const createAdminUserSchema = z.object({
  email: z.string().trim().min(1, "Укажите email").email("Некорректный email"),
  password: z.string().min(8, "Пароль минимум 8 символов").max(200),
  role: z.enum(ADMIN_ROLE_VALUES),
});

export const updateAdminUserRoleSchema = z.object({
  role: z.enum(ADMIN_ROLE_VALUES),
});
