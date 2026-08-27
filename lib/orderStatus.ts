// Статусы заказа и их русские подписи — чистые константы, без импорта Prisma.
// Вынесены отдельно, чтобы их могли тянуть и Server Components (списки заказов),
// и клиентский OrderStatusControl, не втягивая в бандл ни мок lib/orders.ts, ни
// node:-рантайм Prisma (та же причина, что у lib/validations/orderStatus.ts).
//
// Значения совпадают с enum OrderStatus в prisma/schema.prisma — Prisma-тип
// $Enums.OrderStatus структурно эквивалентен этому union'у (тот же набор
// строковых литералов), поэтому AdminOrder.status подставляется в подписи как есть.
export type OrderStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "PREPARING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

// Порядок и формулировки — 1-в-1 из about-project.md ("новый / в работе /
// готовится / готов / доставлен / отменён").
export const ORDER_STATUSES: OrderStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "PREPARING",
  "READY",
  "DELIVERED",
  "CANCELLED",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Новый",
  IN_PROGRESS: "В работе",
  PREPARING: "Готовится",
  READY: "Готов",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
};

export type PaymentStatus = "PAID" | "UNPAID";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PAID: "Оплачен",
  UNPAID: "Не оплачен",
};
