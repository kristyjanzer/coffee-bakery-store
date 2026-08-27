import type { OrderStatus } from "@/lib/orderStatus";

// Клиентский helper для смены статуса заказа из админки (docs/plan.md, пункты 16/29/35).
// OrderStatusControl — клиентский компонент, поэтому пишет через HTTP-границу
// PATCH /api/orders/[id] (проверка сессии ADMIN/ORDER_MANAGER — в роуте), а не
// дёргает Prisma напрямую. Тот же приём, что submitOrder() в lib/orders.ts.
export type UpdateOrderStatusResult = { ok: true } | { ok: false; error: string };

export async function updateOrderStatus(
  id: number,
  status: OrderStatus
): Promise<UpdateOrderStatusResult> {
  try {
    const response = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: data?.error ?? "Не удалось изменить статус заказа." };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Нет связи с сервером. Попробуйте ещё раз." };
  }
}
