import { NextResponse } from "next/server";
import { getOrderById, updateOrderStatus } from "@/lib/server/orderAdmin";
import { updateOrderStatusSchema } from "@/lib/validations/orderStatus";
import { requireAdminSession } from "@/lib/auth/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseOrderId(id: string): number | null {
  const orderId = Number(id);
  return Number.isInteger(orderId) ? orderId : null;
}

// GET /api/orders/[id] — детали заказа, ADMIN и ORDER_MANAGER (docs/plan.md, пункт 29).
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession(["ADMIN", "ORDER_MANAGER"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  const { id } = await params;
  const orderId = parseOrderId(id);
  if (orderId === null) {
    return NextResponse.json({ error: "Некорректный id заказа" }, { status: 400 });
  }

  try {
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error("GET /api/orders/[id]:", error);
    return NextResponse.json({ error: "Не удалось загрузить заказ" }, { status: 500 });
  }
}

// PATCH /api/orders/[id] — смена статуса, ADMIN и ORDER_MANAGER (docs/plan.md, пункт 29).
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession(["ADMIN", "ORDER_MANAGER"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  const { id } = await params;
  const orderId = parseOrderId(id);
  if (orderId === null) {
    return NextResponse.json({ error: "Некорректный id заказа" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = updateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректный статус заказа", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const order = await updateOrderStatus(orderId, parsed.data.status);
    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error("PATCH /api/orders/[id]:", error);
    return NextResponse.json({ error: "Не удалось изменить статус заказа" }, { status: 500 });
  }
}
