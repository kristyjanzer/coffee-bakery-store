import type { Metadata } from "next";
import Link from "next/link";
import { getAdminReviews } from "@/lib/reviews";

export const metadata: Metadata = {
  title: "Отзывы — Кофейня-пекарня",
};

interface ReviewsPageProps {
  searchParams: Promise<{ status?: string }>;
}

// Список отзывов с фильтром по статусу модерации (docs/plan.md, пункт 19;
// about-project.md, раздел "Отзывы"). Фильтр — обычные ссылки с query-параметром
// (?status=pending), без клиентского JS — тот же приём, что в /admin/orders.
export default async function AdminReviewsPage({ searchParams }: ReviewsPageProps) {
  const { status } = await searchParams;
  const isApproved = status === "pending" ? false : status === "approved" ? true : undefined;
  const reviews = await getAdminReviews({ isApproved });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">
        Отзывы
      </h1>

      <div className="flex flex-wrap gap-3" role="tablist">
        <Link
          href="/admin/reviews"
          role="tab"
          aria-selected={!status}
          className={
            !status
              ? "rounded-sm border border-black-olive px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              : "rounded-sm border border-transparent px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive/60 shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:text-black-olive"
          }
        >
          Все
        </Link>
        <Link
          href="/admin/reviews?status=pending"
          role="tab"
          aria-selected={status === "pending"}
          className={
            status === "pending"
              ? "rounded-sm border border-black-olive px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              : "rounded-sm border border-transparent px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive/60 shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:text-black-olive"
          }
        >
          На модерации
        </Link>
        <Link
          href="/admin/reviews?status=approved"
          role="tab"
          aria-selected={status === "approved"}
          className={
            status === "approved"
              ? "rounded-sm border border-black-olive px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              : "rounded-sm border border-transparent px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive/60 shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:text-black-olive"
          }
        >
          Одобрены
        </Link>
      </div>

      {reviews.length === 0 ? (
        <p className="font-venuscom text-body-sm text-black-olive/70">Отзывов с таким статусом пока нет.</p>
      ) : (
        <div className="overflow-x-auto bg-warm-cream shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-sage-mist">
                {["Автор", "Товар", "Отзыв", "Статус", "Ответ магазина"].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-[15px] py-3 font-venuscom text-caption uppercase text-black-olive/60"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id} className="border-b border-sage-mist last:border-0">
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    <Link href={`/admin/reviews/${review.id}`} className="hover:underline">
                      {review.authorName}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive/70">
                    {review.productName}
                  </td>
                  <td className="max-w-md px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    <span className="line-clamp-2">«{review.quoteText}»</span>
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3">
                    <span
                      className={
                        review.isApproved
                          ? "rounded-sm bg-sage-mist/30 px-2 py-1 font-venuscom text-caption uppercase text-forest-ink"
                          : "rounded-sm bg-red-500/10 px-2 py-1 font-venuscom text-caption uppercase text-red-600"
                      }
                    >
                      {review.isApproved ? "Одобрен" : "На модерации"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive/70">
                    {review.shopReply ? "Есть" : "Нет"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
