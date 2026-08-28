import { z } from "zod";

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

// Телефон к единому виду +7XXXXXXXXXX: только цифры, ведущая 8 → 7, префикс +.
// Нужно, чтобы один человек с "+7 900…" и "8 900…" не создал двух Customer
// (upsert по phone в lib/orderCreation.ts).
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, ""); // выкидываем скобки, пробелы, дефисы, плюс
  if (digits.length === 11 && digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`; // 8 900… → 7 900…
  }
  if (!digits.startsWith("7")) {
    digits = `7${digits}`; // "900…" без кода страны → добавляем 7
  }
  return `+${digits}`;
}

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
  // Верхняя граница — заведомо больше любого реального заказа пекарни, но не даёт
  // прислать абсурдное число (гигантская totalAmount у товара с stockQuantity: null,
  // раздутое сообщение в Telegram). Дополнительно к остатку на складе, который
  // проверяет createOrder() по Prisma.
  quantity: z.number().int().positive().max(100, "Не больше 100 шт. одной позиции"),
});

export const createOrderSchema = orderFormSchema
  .extend({
    // max — тот же приём, что bannerListSchema.max(20): не принимать абсурдный
    // объём позиций в одном запросе.
    items: z.array(orderItemInputSchema).min(1, "Корзина пуста").max(50, "Слишком много позиций"),
  })
  .refine((values) => !values.preferredDate || !Number.isNaN(Date.parse(values.preferredDate)), {
    message: "Некорректная дата предзаказа",
    path: ["preferredDate"],
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
