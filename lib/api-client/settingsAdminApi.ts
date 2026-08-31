import type { AdminRole } from "@/lib/auth/adminRoles";
import type { AdminUserInput, NotificationSettings } from "@/lib/server/settings";

// Клиентский helper для мутаций раздела «Настройки» из админки (docs/plan.md,
// пункт 21). AdminUsersManager / NotificationSettingsForm — клиентские компоненты,
// поэтому пишут через HTTP-границу /api/* (проверка сессии ADMIN + zod — в роутах),
// а не дёргают Prisma. Тот же приём, что lib/api-client/productAdminApi.ts / lib/api-client/pageAdminApi.ts.
export type SettingsMutationResult = { ok: true } | { ok: false; error: string };

async function errorFrom(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

async function call(
  url: string,
  method: string,
  body: unknown,
  fallback: string
): Promise<SettingsMutationResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) return { ok: false, error: await errorFrom(response, fallback) };
    return { ok: true };
  } catch {
    return { ok: false, error: "Нет связи с сервером. Попробуйте ещё раз." };
  }
}

export async function createAdminUser(input: AdminUserInput): Promise<SettingsMutationResult> {
  return call("/api/admin-users", "POST", input, "Не удалось создать пользователя.");
}

export async function updateAdminUserRole(
  id: number,
  role: AdminRole
): Promise<SettingsMutationResult> {
  return call(`/api/admin-users/${id}`, "PATCH", { role }, "Не удалось изменить роль.");
}

export async function deleteAdminUser(id: number): Promise<SettingsMutationResult> {
  return call(`/api/admin-users/${id}`, "DELETE", undefined, "Не удалось удалить пользователя.");
}

export async function updateNotificationSettings(
  input: NotificationSettings
): Promise<SettingsMutationResult> {
  return call("/api/settings/notifications", "PUT", input, "Не удалось сохранить настройки.");
}
