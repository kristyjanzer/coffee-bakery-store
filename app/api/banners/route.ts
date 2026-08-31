import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/auth";
import { bannerListSchema } from "@/lib/validations/banner";

// PUT /api/banners — форма админки редактирует весь список баннеров разом
// (добавление/удаление/переупорядочивание) и сохраняет одной кнопкой. Проще
// заменить всю таблицу в одной транзакции, чем вести отдельные create/update/delete
// по строкам. sortOrder = индекс в присланном массиве.
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

  const parsed = bannerListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректный список баннеров", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction([
      prisma.banner.deleteMany({}),
      prisma.banner.createMany({
        data: parsed.data.map((b, index) => ({ ...b, sortOrder: index })),
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/banners:", error);
    return NextResponse.json({ error: "Не удалось сохранить баннеры" }, { status: 500 });
  }
}
