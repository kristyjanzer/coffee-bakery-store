import { z } from "zod";

// Имена полей совпадают с моделью Order (docs/architecture.md, раздел 3) —
// когда появится POST /api/orders (пункт 28 плана), схема и форма подключатся
// без переименований, как lib/menu.ts/lib/reviews.ts для каталога/отзывов.
export const orderFormSchema = z.object({
  customerName: z.string().trim().min(2, "Укажите имя").max(100),
  customerContact: z.string().trim().min(5, "Укажите телефон").max(100),
  // Отдельное обязательное поле — на этот адрес отправляется чек об оплате.
  email: z.string().trim().min(1, "Укажите email").email("Некорректный email"),
  comment: z.string().trim().max(500).optional().or(z.literal("")),
  preferredDate: z.string().trim().optional().or(z.literal("")),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;

export const orderFormDefaultValues: OrderFormValues = {
  customerName: "",
  customerContact: "",
  email: "",
  comment: "",
  preferredDate: "",
};
