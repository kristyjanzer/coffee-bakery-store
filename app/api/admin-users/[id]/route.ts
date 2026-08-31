import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { updateAdminUserRole, deleteAdminUser, LastAdminError } from "@/lib/server/settings";
import { updateAdminUserRoleSchema } from "@/lib/validations/adminUser";
import { authOptions, requireAdminSession } from "@/lib/auth/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Email текущего администратора берём напрямую из сессии NextAuth (JWT), а не из
// requireAdminSession — его форму менять нельзя (см. lib/auth.test.ts).
async function currentAdminEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.email ?? null;
}

// true, если id указывает на самого текущего администратора — тогда снять с себя
// роль ADMIN / удалить себя нельзя (иначе можно случайно заблокировать себе доступ).
async function guardSelf(id: number, email: string | null): Promise<boolean> {
  if (!email) return false;
  const target = await prisma.adminUser.findUnique({ where: { id }, select: { email: true } });
  return target?.email === email;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession(["ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) return NextResponse.json({ error: "Некорректный id" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = updateAdminUserRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректная роль" }, { status: 400 });
  }

  if (parsed.data.role !== "ADMIN" && (await guardSelf(id, await currentAdminEmail()))) {
    return NextResponse.json(
      { error: "Нельзя снять роль администратора с самого себя" },
      { status: 409 }
    );
  }

  try {
    const updated = await updateAdminUserRole(id, parsed.data.role);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof LastAdminError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }
    console.error("PATCH /api/admin-users/[id]:", error);
    return NextResponse.json({ error: "Не удалось изменить роль" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession(["ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) return NextResponse.json({ error: "Некорректный id" }, { status: 400 });

  if (await guardSelf(id, await currentAdminEmail())) {
    return NextResponse.json({ error: "Нельзя удалить самого себя" }, { status: 409 });
  }

  try {
    await deleteAdminUser(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof LastAdminError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }
    console.error("DELETE /api/admin-users/[id]:", error);
    return NextResponse.json({ error: "Не удалось удалить пользователя" }, { status: 500 });
  }
}
