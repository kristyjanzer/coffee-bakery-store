export type AdminRole = "ADMIN" | "ORDER_MANAGER";

export const ADMIN_ROLES: AdminRole[] = ["ADMIN", "ORDER_MANAGER"];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  ADMIN: "Администратор",
  ORDER_MANAGER: "Менеджер заказов",
};

export interface AdminUserRecord {
  id: number;
  email: string;
  role: AdminRole;
}

// Временный источник данных до подключения Prisma/NextAuth (docs/plan.md, пункты
// 22-25, 31) — тот же приём, что в lib/pages.ts: сигнатуры уже async/Promise, замена
// на реальные запросы будет "тихой". AdminUser в схеме (docs/architecture.md,
// раздел 3) уже содержит email/passwordHash/role — здесь пароль не хранится и не
// показывается, только то, что реально нужно списку/форме.
const ADMIN_USERS: AdminUserRecord[] = [
  { id: 1, email: "admin@example.com", role: "ADMIN" },
  { id: 2, email: "orders@example.com", role: "ORDER_MANAGER" },
];

export interface NotificationSettings {
  notifyEmail: boolean;
  notifyEmailAddress: string;
  notifySms: boolean;
  notifySmsPhone: string;
}

const NOTIFICATION_SETTINGS: NotificationSettings = {
  notifyEmail: true,
  notifyEmailAddress: "orders@example.com",
  notifySms: false,
  notifySmsPhone: "",
};

export async function getAdminUsers(): Promise<AdminUserRecord[]> {
  return ADMIN_USERS;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return NOTIFICATION_SETTINGS;
}

export interface AdminUserInput {
  email: string;
  password: string;
  role: AdminRole;
}

// Заглушки: POST/PATCH/DELETE для пользователей админки появятся вместе с остальными
// мутациями (пункты 22-31 плана). Не мутируют ADMIN_USERS — тот же принцип, что
// moderateReview()/updateProduct(): вызывающий компонент держит новое состояние сам.
export function createAdminUser(input: AdminUserInput): Promise<{ success: true }> {
  void input;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 500);
  });
}

export function updateAdminUserRole(id: number, role: AdminRole): Promise<{ success: true }> {
  void id;
  void role;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 500);
  });
}

export function deleteAdminUser(id: number): Promise<{ success: true }> {
  void id;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 500);
  });
}

export function updateNotificationSettings(input: NotificationSettings): Promise<{ success: true }> {
  void input;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 500);
  });
}
