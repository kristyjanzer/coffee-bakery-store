import { NextResponse } from "next/server";
import { createOrderSchema } from "@/lib/validations/order";
import { createOrder } from "@/lib/orderCreation";

// POST /api/orders — публичное создание заявки гостем (docs/plan.md, пункт 28).
// GET (список заказов для админки) отложен до NextAuth (пункт 31) — по тому же
// принципу, что и мутирующие методы /api/products (см. docs/progress.md, задача 54):
// роуту, которому нужна проверка сессии администратора, ещё не на чем её проверять.
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
