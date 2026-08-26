import { NextResponse } from "next/server";
import { OrderStatus } from "@/generated/prisma/client";
import { createOrderSchema } from "@/lib/validations/order";
import { createOrder } from "@/lib/orderCreation";
import { getOrders } from "@/lib/orderAdmin";
import { requireAdminSession } from "@/lib/auth";

const ORDER_STATUS_VALUES = Object.values(OrderStatus) as OrderStatus[];

// GET /api/orders — список заказов для админки (docs/plan.md, пункт 28). Доступно
// ADMIN и ORDER_MANAGER (about-project.md: "менеджер заказов" — роль как раз под это).
export async function GET(request: Request) {
  const auth = await requireAdminSession(["ADMIN", "ORDER_MANAGER"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  const statusParam = new URL(request.url).searchParams.get("status");
  if (statusParam !== null && !ORDER_STATUS_VALUES.includes(statusParam as OrderStatus)) {
    return NextResponse.json({ error: "Некорректный статус заказа" }, { status: 400 });
  }
  const status = statusParam === null ? undefined : (statusParam as OrderStatus);

  try {
    const orders = await getOrders(status);
    return NextResponse.json(orders);
  } catch (error) {
    console.error("GET /api/orders:", error);
    return NextResponse.json({ error: "Не удалось загрузить заказы" }, { status: 500 });
  }
}

// POST /api/orders — публичное создание заявки гостем (docs/plan.md, пункт 28).
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные данные заявки", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await createOrder(parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ orderId: result.orderId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders:", error);
    return NextResponse.json({ error: "Не удалось создать заявку" }, { status: 500 });
  }
}
