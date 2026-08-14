import type { Metadata } from "next";
import { Dashboard } from "@/components/admin/Dashboard";
import { getDashboardSummary, getPendingOrders, getSalesChart, getTopProducts } from "@/lib/dashboard";
import { getAdminReviews } from "@/lib/reviews";

export const metadata: Metadata = {
  title: "Дашборд — Кофейня-пекарня",
};

// Server Component — данные читаются напрямую (пока из lib/dashboard.ts, мок; станет
// Prisma-запросом в пунктах 22-28 без переделки Dashboard.tsx), без похода через /api/*.
export default async function AdminDashboardPage() {
  const [summary, salesChart, topProducts, pendingOrders, reviews] = await Promise.all([
    getDashboardSummary(),
    getSalesChart(),
    getTopProducts(),
    getPendingOrders(),
    // getAdminReviews(), не публичная getReviews() — уведомление "новый отзыв" должно
    // показывать и неодобренные отзывы (задача 19, раздел "Отзывы"), их-то как раз и
    // нужно первым делом заметить и промодерировать.
    getAdminReviews(),
  ]);

  return (
    <Dashboard
      summary={summary}
      salesChart={salesChart}
      topProducts={topProducts}
      pendingOrders={pendingOrders}
      reviews={reviews}
    />
  );
}
