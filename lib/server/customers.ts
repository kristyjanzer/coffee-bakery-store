import { prisma } from "@/lib/prisma";

// Раздел админки «Клиенты» (docs/plan.md, пункт 18; about-project.md). Источник —
// таблица Customer (заполняется в createOrder, lib/server/orderCreation.ts, upsert по
// телефону) + агрегаты по её заказам.
export interface CustomerRecord {
  id: number;
  name: string;
  phone: string;
  email: string;
  deliveryAddress: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: Date | null;
}

const customerSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  deliveryAddress: true,
  orders: { select: { totalAmount: true, createdAt: true } },
} as const;

type CustomerRow = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  deliveryAddress: string | null;
  orders: { totalAmount: number; createdAt: Date }[];
};

function toRecord(row: CustomerRow): CustomerRecord {
  // Дата последнего заказа — максимум createdAt по заказам клиента (null, если их нет).
  const lastOrderAt = row.orders.reduce<Date | null>(
    (latest, o) => (!latest || o.createdAt > latest ? o.createdAt : latest),
    null
  );
  return {
    id: row.id,
    name: row.name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    deliveryAddress: row.deliveryAddress ?? "",
    ordersCount: row.orders.length,
    totalSpent: row.orders.reduce((sum, o) => sum + o.totalAmount, 0),
    lastOrderAt,
  };
}

export async function getCustomers(): Promise<CustomerRecord[]> {
  const rows = (await prisma.customer.findMany({ select: customerSelect })) as CustomerRow[];
  // "Недавно оформлял заказ — выше"; клиенты без заказов уезжают в конец.
  return rows
    .map(toRecord)
    .sort((a, b) => (b.lastOrderAt?.getTime() ?? 0) - (a.lastOrderAt?.getTime() ?? 0));
}

export async function getCustomerById(id: number): Promise<CustomerRecord | null> {
  const row = (await prisma.customer.findUnique({
    where: { id },
    select: customerSelect,
  })) as CustomerRow | null;
  return row ? toRecord(row) : null;
}
