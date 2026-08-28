import { prisma } from "@/lib/prisma";

// Дашборд (docs/plan.md, пункт 15) — агрегаты по не-отменённым заказам из Prisma.
// Заменяет мок lib/dashboard.ts. Форма возвращаемых типов сохранена, чтобы
// components/admin/Dashboard.tsx правился минимально.
const NOT_CANCELLED = { status: { not: "CANCELLED" as const } };

export interface DashboardSummary {
  ordersToday: number;
  revenueToday: number;
  avgCheckToday: number;
  ordersWeek: number;
  revenueWeek: number;
  avgCheckWeek: number;
}

function startOfToday(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}
function daysAgo(n: number, now = new Date()): Date {
  const d = startOfToday(now);
  d.setDate(d.getDate() - n);
  return d;
}
const avg = (sum: number, count: number) => (count === 0 ? 0 : Math.round(sum / count));

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const weekStart = daysAgo(6);
  const orders = await prisma.order.findMany({
    where: { ...NOT_CANCELLED, createdAt: { gte: weekStart } },
    select: { createdAt: true, totalAmount: true },
  });
  const today = startOfToday();
  const todays = orders.filter((o) => o.createdAt >= today);
  const revenueToday = todays.reduce((s, o) => s + o.totalAmount, 0);
  const revenueWeek = orders.reduce((s, o) => s + o.totalAmount, 0);
  return {
    ordersToday: todays.length,
    revenueToday,
    avgCheckToday: avg(revenueToday, todays.length),
    ordersWeek: orders.length,
    revenueWeek,
    avgCheckWeek: avg(revenueWeek, orders.length),
  };
}

export type SalesRange = "days" | "weeks" | "months";
export const SALES_RANGES: SalesRange[] = ["days", "weeks", "months"];

export interface SalesChartPoint {
  dayLabel: string; // "Пн" | "12–18.08" | "Авг"
  fullDate: string;
  revenue: number;
}

const WEEKDAY = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTH = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

export async function getSalesChart(range: SalesRange): Promise<SalesChartPoint[]> {
  const now = new Date();
  const bucketCount = range === "days" ? 7 : range === "weeks" ? 8 : 6;

  // границы бакетов от старого к новому: [start, end)
  const buckets: { start: Date; end: Date; label: string; fullDate: string }[] = [];
  for (let i = bucketCount - 1; i >= 0; i--) {
    if (range === "days") {
      const start = daysAgo(i, now);
      const end = daysAgo(i - 1, now);
      buckets.push({
        start,
        end,
        label: WEEKDAY[start.getDay()],
        fullDate: start.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
      });
    } else if (range === "weeks") {
      const start = daysAgo(i * 7 + 6, now);
      const end = daysAgo(i * 7 - 1, now);
      const last = new Date(end);
      last.setDate(last.getDate() - 1);
      buckets.push({
        start,
        end,
        label: start.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
        fullDate: `${start.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}–${last.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}`,
      });
    } else {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      buckets.push({
        start,
        end,
        label: MONTH[start.getMonth()],
        fullDate: `${MONTH[start.getMonth()]} ${start.getFullYear()}`,
      });
    }
  }

  const windowStart = buckets[0].start;
  const orders = await prisma.order.findMany({
    where: { ...NOT_CANCELLED, createdAt: { gte: windowStart } },
    select: { createdAt: true, totalAmount: true },
  });

  return buckets.map((b) => ({
    dayLabel: b.label,
    fullDate: b.fullDate,
    revenue: orders
      .filter((o) => o.createdAt >= b.start && o.createdAt < b.end)
      .reduce((s, o) => s + o.totalAmount, 0),
  }));
}

export interface TopProduct {
  id: number;
  name: string;
  unitsSold: number;
}

export async function getTopProducts(): Promise<TopProduct[]> {
  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: NOT_CANCELLED },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });
  const ids = grouped.map((g) => g.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  return grouped.map((g) => ({
    id: g.productId,
    name: nameById.get(g.productId) ?? `Товар #${g.productId}`,
    unitsSold: g._sum.quantity ?? 0,
  }));
}

export type PendingOrderStatus = "NEW" | "IN_PROGRESS";

export interface PendingOrder {
  id: number;
  customerName: string;
  itemsSummary: string;
  totalAmount: number;
  status: PendingOrderStatus;
  createdAt: Date;
}

// Заказы "требующие обработки" (about-project.md) — только NEW/IN_PROGRESS, свежие
// сверху, максимум 4 строки на дашборде. Полный список — в разделе "Заказы".
export async function getPendingOrders(): Promise<PendingOrder[]> {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["NEW", "IN_PROGRESS"] } },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true,
      customerName: true,
      totalAmount: true,
      status: true,
      createdAt: true,
      items: { select: { productNameSnapshot: true, quantity: true } },
    },
  });
  return orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    itemsSummary: o.items.map((i) => `${i.productNameSnapshot} × ${i.quantity}`).join(", "),
    totalAmount: o.totalAmount,
    status: o.status as PendingOrderStatus,
    createdAt: o.createdAt,
  }));
}
