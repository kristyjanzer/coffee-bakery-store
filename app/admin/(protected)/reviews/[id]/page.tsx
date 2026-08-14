import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminReviewById } from "@/lib/reviews";
import { ReviewModerationControl } from "@/components/admin/ReviewModerationControl";

export const metadata: Metadata = {
  title: "Отзыв — Coffee Bakery",
};

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

// Карточка отзыва (docs/plan.md, пункт 19): текст, автор, товар, модерация + ответ от
// магазина через ReviewModerationControl.
export default async function AdminReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  const reviewId = Number(id);
  const review = Number.isNaN(reviewId) ? undefined : await getAdminReviewById(reviewId);

  if (!review) {
    notFound();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <Link
          href="/admin/reviews"
          className="font-venuscom text-caption text-black-olive/60 hover:text-black-olive hover:underline"
        >
          ← Все отзывы
        </Link>
        <h1 className="mt-2 font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">
          Отзыв от {review.authorName}
        </h1>
        <p className="mt-1 font-venuscom text-caption text-black-olive/60">Товар: {review.productName}</p>
      </div>

      <section className="bg-warm-cream p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
        <p className="font-venuscom text-body-sm text-black-olive">«{review.quoteText}»</p>
      </section>

      <section className="bg-warm-cream p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
        <ReviewModerationControl
          reviewId={review.id}
          initialIsApproved={review.isApproved}
          initialShopReply={review.shopReply}
        />
      </section>
    </div>
  );
}
