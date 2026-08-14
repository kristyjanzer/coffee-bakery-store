import type { Metadata } from "next";
import { Dashboard } from "@/components/admin/Dashboard";
import { getDashboardSummary, getPendingOrders, getSalesChart, getTopProducts } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Дашборд — Кофейня-пекарня",
};

// Server Component — данные читаются напрямую (пока из lib/dashboard.ts, мок; станет
// Prisma-запросом в пунктах 22-28 без переделки Dashboard.tsx), без похода через /api/*.
export default async function AdminDashboardPage() {
  const [summary, salesChart, topProducts, pendingOrders] = await Promise.all([
    getDashboardSummary(),
    getSalesChart(),
    getTopProducts(),
    getPendingOrders(),
  ]);

  return (
    <Dashboard
      summary={summary}
      salesChart={salesChart}
      topProducts={topProducts}
      pendingOrders={pendingOrders}
    />
  );
}
