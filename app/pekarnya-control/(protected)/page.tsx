import type { Metadata } from "next";
import { Dashboard } from "@/components/admin/Dashboard";
import { getDashboardSummary, getPendingOrders, getSalesChart, getTopProducts } from "@/lib/dashboard";
import { getAdminReviews } from "@/lib/reviewsApi";

export const metadata: Metadata = {
  title: "Дашборд — Coffee Bakery",
};

// Server Component — данные читаются напрямую (пока из lib/dashboard.ts, мок; станет
// Prisma-запросом в пунктах 22-28 без переделки Dashboard.tsx), без похода через /api/*.
export default async function AdminDashboardPage() {
  const [summary, salesChart, topProducts, pendingOrders, reviewRows] = await Promise.all([
    getDashboardSummary(),
    getSalesChart(),
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
    />
  );
}
