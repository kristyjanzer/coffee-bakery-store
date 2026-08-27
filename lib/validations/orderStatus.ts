import { z } from "zod";
import { OrderStatus } from "@/generated/prisma/client";

// Тело запроса PATCH /api/orders/[id] (пункт 29 плана) — только смена статуса
// (docs/architecture.md, раздел "Роутинг": "GET/PATCH — детали и смена статуса").
//
// В отдельном файле от lib/validations/order.ts намеренно: тот файл (orderFormSchema
// и т.д.) импортируют клиентские компоненты (CheckoutForm, CartWidget), а этот импорт
// Prisma-клиента (использует node:async_hooks, серверный API) в их бандл попадать не
// должен — иначе сборка на клиенте падает с "UnhandledSchemeError: node: URI".
export const updateOrderStatusSchema = z.object({
  status: z.enum(Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]]),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
