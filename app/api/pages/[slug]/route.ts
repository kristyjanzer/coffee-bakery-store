import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { sitePageInputSchema, PAGE_SLUGS, type PageSlug } from "@/lib/validations/page";

// PATCH /api/pages/[slug] — правка контента одной фиксированной страницы + SEO
// (docs/plan.md, пункт 20). HTTP-граница для клиентской формы админки: проверка
// сессии ADMIN и zod — здесь, до обращения к Prisma (docs/architecture.md, раздел 7).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAdminSession(["ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  const { slug } = await params;
  if (!PAGE_SLUGS.includes(slug as PageSlug)) {
    return NextResponse.json({ error: "Неизвестная страница" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = sitePageInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные данные страницы", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.sitePage.update({ where: { slug }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/pages/[slug]:", error);
    return NextResponse.json({ error: "Не удалось сохранить страницу" }, { status: 500 });
  }
}
