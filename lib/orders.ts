import type { OrderFormValues } from "@/lib/validations/order";
import type { CartItem } from "@/stores/cartStore";

export interface SubmitOrderPayload {
  form: OrderFormValues;
  items: CartItem[];
  totalPrice: number;
}

// Заглушка: POST /api/orders (докс/plan.md, пункт 28) ещё не существует —
// backend/Prisma/Telegram появятся только в пунктах 22-36. Здесь только имитация
// сети, чтобы форма (пункт 12) была протестирована целиком. Сигнатура (payload → успех)
// рассчитана на "тихую" замену на fetch("/api/orders") без переделки CheckoutForm/CartWidget,
// как lib/menu.ts/lib/reviews.ts для каталога/отзывов.
export function submitOrder(payload: SubmitOrderPayload): Promise<{ success: true }> {
  void payload;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 600);
  });
}
