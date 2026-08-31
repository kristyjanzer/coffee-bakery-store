import type { OrderFormValues } from "@/lib/validations/order";
import type { CartItem } from "@/stores/cartStore";

export interface SubmitOrderPayload {
  form: OrderFormValues;
  items: CartItem[];
  // Итог считает сервер сам (по ценам из Prisma), сюда передаётся только для
  // единообразия вызова из CartWidget — в теле запроса не уходит.
  totalPrice: number;
}

export type SubmitOrderResult =
  | { ok: true; orderId: number }
  | { ok: false; error: string };

// Отправка заявки гостем на POST /api/orders (docs/plan.md, пункты 12/28). Это тот
// самый разрешённый случай, когда клиентский компонент (CartWidget) ходит в свой
// же /api/* — HTTP-граница мутации из браузера (docs/architecture.md, «Важное правило»).
// Цену и название товара с клиента не шлём: сервер берёт их из Prisma по productId,
// иначе покупатель мог бы подделать сумму (см. lib/server/orderCreation.ts).
export async function submitOrder(payload: SubmitOrderPayload): Promise<SubmitOrderResult> {
  const { form, items } = payload;

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: form.customerName,
        customerContact: form.customerContact,
        email: form.email,
        comment: form.comment,
        preferredDate: form.preferredDate,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | { orderId?: number; error?: string }
      | null;

    if (!response.ok) {
      return {
        ok: false,
        error: data?.error ?? "Не удалось отправить заявку. Попробуйте ещё раз.",
      };
    }

    return { ok: true, orderId: data?.orderId ?? 0 };
  } catch {
    return {
      ok: false,
      error: "Нет связи с сервером. Проверьте подключение и попробуйте ещё раз.",
    };
  }
}

// Статусы и подписи переехали в lib/shared/orderStatus.ts (чистые константы, отдельно от
// мутаций/Prisma) — чтобы их могли тянуть и Server Components списков заказов на
// Prisma (lib/server/orderAdmin.ts), и клиентский OrderStatusControl. Ре-экспорт — чтобы
// не ломать существующие импорты из "@/lib/api-client/orders".
export type { OrderStatus, PaymentStatus } from "@/lib/shared/orderStatus";
export { ORDER_STATUSES, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/shared/orderStatus";
