import { z } from "zod";
import { OrderStatus } from "@/generated/prisma/client";

// Имена полей совпадают с моделью Order (docs/architecture.md, раздел 3) —
// когда появится POST /api/orders (пункт 28 плана), схема и форма подключатся
// без переименований, как lib/menu.ts/lib/reviews.ts для каталога/отзывов.
export const orderFormSchema = z.object({
  customerName: z.string().trim().min(2, "Укажите имя").max(100),
  // Значение приходит уже промаскированным (formatPhoneInput в CheckoutForm,
  // формат "+7 900 000-00-00") — считаем только цифры, чтобы отличить
  // полностью введённый номер (11 цифр: код страны + 10 цифр) от обрубленного
  // на середине ("+7 900" проходил бы min(5), хотя номер не дописан).
  customerContact: z
    .string()
    .trim()
    .min(1, "Укажите телефон")
    .refine((value) => value.replace(/\D/g, "").length === 11, "Введите номер телефона полностью"),
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

// Тело запроса POST /api/orders (пункт 28 плана): те же поля формы + состав корзины.
// Цену и название товара с клиента не берём — сервер сам смотрит их в Prisma по
// productId (lib/orderCreation.ts), чтобы нельзя было подделать сумму заказа.
export const orderItemInputSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const createOrderSchema = orderFormSchema
  .extend({
    items: z.array(orderItemInputSchema).min(1, "Корзина пуста"),
  })
  .refine((values) => !values.preferredDate || !Number.isNaN(Date.parse(values.preferredDate)), {
    message: "Некорректная дата предзаказа",
    path: ["preferredDate"],
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// Тело запроса PATCH /api/orders/[id] (пункт 29 плана) — только смена статуса
// (docs/architecture.md, раздел "Роутинг": "GET/PATCH — детали и смена статуса").
export const updateOrderStatusSchema = z.object({
  status: z.enum(Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]]),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
