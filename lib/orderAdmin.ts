import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/generated/prisma/client";

// Список заказов для админки (docs/plan.md, пункт 28, GET /api/orders) — не путать
// с lib/orders.ts (мок-данные раздела админки "Заказы", пункт 16, ещё не переведён
// на Prisma; та же логика разделения, что у lib/productCatalog.ts vs lib/products.ts).
export interface AdminOrderItem {
  productId: number;
  productNameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
}

export interface AdminOrder {
  id: number;
  status: OrderStatus;
  customerName: string;
  customerContact: string;
  customerEmail: string;
  comment: string | null;
  preferredDate: Date | null;
  totalAmount: number;
  paymentMethod: string | null;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  items: AdminOrderItem[];
}

export async function getOrders(status?: OrderStatus): Promise<AdminOrder[]> {
  return prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      customerName: true,
      customerContact: true,
      customerEmail: true,
      comment: true,
      preferredDate: true,
      totalAmount: true,
      paymentMethod: true,
      paymentStatus: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: { productId: true, productNameSnapshot: true, priceSnapshot: true, quantity: true },
      },
    },
  });
}
