import type { Metadata } from "next";
import { Dashboard } from "@/components/admin/Dashboard";
import {
  getDashboardSummary,
  getPendingOrders,
  getSalesChart,
  getTopProducts,
  SALES_RANGES,
  type SalesRange,
} from "@/lib/server/dashboardStats";
import { getAdminReviews } from "@/lib/server/reviewsApi";

export const metadata: Metadata = {
  title: "Дашборд — Coffee Bakery",
};

interface Props {
  searchParams: Promise<{ range?: string }>;
}

function parseRange(raw: string | undefined): SalesRange {
  return SALES_RANGES.includes(raw as SalesRange) ? (raw as SalesRange) : "days";
}

// Server Component — данные читаются напрямую из Prisma (lib/server/dashboardStats.ts —
// агрегаты по не-отменённым заказам), без похода через /api/*. Период графика
// продаж — из ?range= (дни/недели/месяцы), переключается ссылками SalesRangeTabs.
export default async function AdminDashboardPage({ searchParams }: Props) {
  const { range: rawRange } = await searchParams;
  const range = parseRange(rawRange);

  const [summary, salesChart, topProducts, pendingOrders, reviewRows] = await Promise.all([
    getDashboardSummary(),
    getSalesChart(range),
    getTopProducts(),
    getPendingOrders(),
    // getAdminReviews(), не getSliderReviews() — уведомление "новый отзыв" должно
    // показывать и неодобренные отзывы (задача 19, раздел "Отзывы"), их-то как раз и
    // нужно первым делом заметить и промодерировать.
    getAdminReviews(),
  ]);

  // ApiReview (productName/imageUrl nullable) → форма Review, которую ждёт Dashboard.
  const reviews = reviewRows.map((row) => ({
    id: row.id,
    authorName: row.authorName,
    quoteText: row.quoteText,
    productName: row.productName ?? "",
    imageUrl: row.imageUrl ?? "",
    isApproved: row.isApproved,
    shopReply: row.shopReply,
  }));

  return (
    <Dashboard
      summary={summary}
      salesChart={salesChart}
      topProducts={topProducts}
      pendingOrders={pendingOrders}
      reviews={reviews}
      range={range}
    />
  );
}
