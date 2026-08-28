import { NextResponse } from "next/server";
import { updateNotificationSettings } from "@/lib/settings";
import { notificationSettingsSchema } from "@/lib/validations/notificationSettings";
import { requireAdminSession } from "@/lib/auth";

// PUT /api/settings/notifications — настройки email/SMS-уведомлений о заказах,
// только ADMIN (docs/plan.md, пункт 21). Одна строка (id: 1) — целиком заменяется.
export async function PUT(request: Request) {
  const auth = await requireAdminSession(["ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = notificationSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные настройки", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(await updateNotificationSettings(parsed.data));
  } catch (error) {
    console.error("PUT /api/settings/notifications:", error);
    return NextResponse.json({ error: "Не удалось сохранить настройки" }, { status: 500 });
  }
}
