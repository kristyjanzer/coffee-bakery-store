import { NextResponse } from "next/server";
import { getAdminUsers, createAdminUser } from "@/lib/settings";
import { createAdminUserSchema } from "@/lib/validations/adminUser";
import { requireAdminSession } from "@/lib/auth";

// GET/POST /api/admin-users — управление пользователями админки, только ADMIN
// (docs/plan.md, пункт 21; docs/architecture.md, раздел 7 — проверка сессии до Prisma).
export async function GET() {
  const auth = await requireAdminSession(["ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  try {
    return NextResponse.json(await getAdminUsers());
  } catch (error) {
    console.error("GET /api/admin-users:", error);
    return NextResponse.json({ error: "Не удалось загрузить пользователей" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

  const parsed = createAdminUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные данные пользователя", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const user = await createAdminUser(parsed.data);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Пользователь с таким email уже есть" }, { status: 409 });
    }
    console.error("POST /api/admin-users:", error);
    return NextResponse.json({ error: "Не удалось создать пользователя" }, { status: 500 });
  }
}
