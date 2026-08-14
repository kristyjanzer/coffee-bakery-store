import { getProductById } from "@/lib/menu";

// Мок-данные дашборда (docs/plan.md, пункт 15; about-project.md, раздел "Страница
// административной панели", пункт 1). Order/OrderItem появятся в Prisma только в
// пунктах 22-28, заявки сейчас нигде не сохраняются (lib/orders.ts — заглушка), поэтому
// сводка/график/топ товаров/заказы — правдоподобные тестовые числа, привязанные, где
// возможно, к реальным товарам из menu.json (как lib/reviews.ts для отзывов). Сигнатуры
// уже async — при подключении БД функции заменяются агрегирующими Prisma-запросами без
// переделки Dashboard.tsx.

export interface DashboardSummary {
  ordersToday: number;
  revenueToday: number;
  avgCheckToday: number;
  ordersWeek: number;
  revenueWeek: number;
  avgCheckWeek: number;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const ordersToday = 14;
  const revenueToday = 9820;
  const ordersWeek = 96;
  const revenueWeek = 61200;

  return {
    ordersToday,
    revenueToday,
    avgCheckToday: Math.round(revenueToday / ordersToday),
    ordersWeek,
    revenueWeek,
    avgCheckWeek: Math.round(revenueWeek / ordersWeek),
  };
}

export interface SalesChartPoint {
  dayLabel: string;
  fullDate: string;
  revenue: number;
}

const WEEKDAY_LABELS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const WEEK_REVENUE = [18400, 21200, 15800, 24500, 31200, 38900, 27600];

export async function getSalesChart(): Promise<SalesChartPoint[]> {
  const today = new Date();

  return WEEK_REVENUE.map((revenue, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (WEEK_REVENUE.length - 1 - index));

    return {
      dayLabel: WEEKDAY_LABELS[date.getDay()],
      fullDate: date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
      revenue,
    };
  });
}

export interface TopProduct {
  id: number;
  name: string;
  unitsSold: number;
}

// Реальные товары из menu.json (id сверены отдельно) — фейково только количество продаж.
const TOP_PRODUCT_SALES: Array<{ id: number; unitsSold: number }> = [
  { id: 6, unitsSold: 84 },
  { id: 112, unitsSold: 76 },
  { id: 1, unitsSold: 68 },
  { id: 128, unitsSold: 54 },
  { id: 97, unitsSold: 47 },
];

export async function getTopProducts(): Promise<TopProduct[]> {
  return TOP_PRODUCT_SALES.map(({ id, unitsSold }) => {
    const product = getProductById(id);
    return { id, name: product?.name ?? `Товар #${id}`, unitsSold };
  });
}

export type PendingOrderStatus = "NEW" | "IN_PROGRESS";

export interface PendingOrder {
  id: number;
  customerName: string;
  itemsSummary: string;
  totalAmount: number;
  status: PendingOrderStatus;
  minutesAgo: number;
}

// Заказы "требующие обработки" (about-project.md) — только NEW/IN_PROGRESS из полного
// enum'а OrderStatus (docs/architecture.md), готовые/доставленные/отменённые сюда не попадут.
export async function getPendingOrders(): Promise<PendingOrder[]> {
  return [
    {
      id: 1042,
      customerName: "Анна Смирнова",
      itemsSummary: "Капучино × 2, Круассан с шоколадом × 1",
      totalAmount: 1770,
      status: "NEW",
      minutesAgo: 5,
    },
    {
      id: 1041,
      customerName: "Игорь Петров",
      itemsSummary: "Двойной эспрессо × 1, Штрудель яблочный × 1",
      totalAmount: 1020,
      status: "NEW",
      minutesAgo: 18,
    },
    {
      id: 1040,
      customerName: "Светлана Антонова",
      itemsSummary: "Чизкейк \"Орео\" × 1",
      totalAmount: 930,
      status: "IN_PROGRESS",
      minutesAgo: 32,
    },
    {
      id: 1039,
      customerName: "Дмитрий Волков",
      itemsSummary: "Капучино × 3",
      totalAmount: 810,
      status: "NEW",
      minutesAgo: 47,
    },
  ];
}
