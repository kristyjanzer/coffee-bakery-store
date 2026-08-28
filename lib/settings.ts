import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { AdminRole, AdminUserRecord } from "@/lib/adminRoles";

// Роли/подписи/тип записи — в отдельном Prisma-free модуле (см. комментарий там):
// их тянет клиентский AdminUsersManager, а этот файл импортирует @/lib/prisma.
// Server-код и тесты по-прежнему берут их из "@/lib/settings" через ре-экспорт.
export { ADMIN_ROLES, ADMIN_ROLE_LABELS } from "@/lib/adminRoles";
export type { AdminRole, AdminUserRecord };

// Список/форма пользователей админки (docs/plan.md, пункт 21). Читается напрямую
// из Prisma — Server Component не ходит через свой /api/*. Мутации из клиентских
// форм — через lib/settingsAdminApi.ts → /api/admin-users. Пароль (passwordHash)
// наружу не отдаётся: select ограничен id/email/role.

export interface NotificationSettings {
  notifyEmail: boolean;
  notifyEmailAddress: string;
  notifySms: boolean;
  notifySmsPhone: string;
}

export interface AdminUserInput {
  email: string;
  password: string;
  role: AdminRole;
}

// Ошибка «нельзя снять или удалить последнего ADMIN» — роут ловит её и отдаёт 409.
export class LastAdminError extends Error {
  constructor() {
    super("Нельзя удалить или разжаловать последнего администратора");
    this.name = "LastAdminError";
  }
}

export async function getAdminUsers(): Promise<AdminUserRecord[]> {
  return prisma.adminUser.findMany({
    orderBy: { id: "asc" },
    select: { id: true, email: true, role: true },
  }) as Promise<AdminUserRecord[]>;
}

export async function createAdminUser(input: AdminUserInput): Promise<AdminUserRecord> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, 10);
  const created = await prisma.adminUser.create({
    data: { email, passwordHash, role: input.role },
    select: { id: true, email: true, role: true },
  });
  return created as AdminUserRecord;
}

// Последний ADMIN не должен остаться без прав: если цель — ADMIN и он единственный,
// снятие роли/удаление запрещено (иначе в админку было бы некому войти).
async function assertNotLastAdmin(targetId: number): Promise<void> {
  const target = await prisma.adminUser.findUnique({ where: { id: targetId } });
  if (!target || target.role !== "ADMIN") return;
  const adminCount = await prisma.adminUser.count({ where: { role: "ADMIN" } });
  if (adminCount <= 1) throw new LastAdminError();
}

export async function updateAdminUserRole(id: number, role: AdminRole): Promise<AdminUserRecord> {
  if (role !== "ADMIN") await assertNotLastAdmin(id);
  const updated = await prisma.adminUser.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, role: true },
  });
  return updated as AdminUserRecord;
}

export async function deleteAdminUser(id: number): Promise<void> {
  await assertNotLastAdmin(id);
  await prisma.adminUser.delete({ where: { id } });
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  notifyEmail: false,
  notifyEmailAddress: "",
  notifySms: false,
  notifySmsPhone: "",
};

// NotificationSettings — единственная строка (id: 1). upsert создаёт её при первом
// обращении, чтобы форма всегда получала объект, даже если сида не было.
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const row = await prisma.notificationSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...DEFAULT_NOTIFICATIONS },
  });
  return {
    notifyEmail: row.notifyEmail,
    notifyEmailAddress: row.notifyEmailAddress,
    notifySms: row.notifySms,
    notifySmsPhone: row.notifySmsPhone,
  };
}

export async function updateNotificationSettings(
  input: NotificationSettings
): Promise<NotificationSettings> {
  const row = await prisma.notificationSettings.upsert({
    where: { id: 1 },
    update: input,
    create: { id: 1, ...input },
  });
  return {
    notifyEmail: row.notifyEmail,
    notifyEmailAddress: row.notifyEmailAddress,
    notifySms: row.notifySms,
    notifySmsPhone: row.notifySmsPhone,
  };
}
