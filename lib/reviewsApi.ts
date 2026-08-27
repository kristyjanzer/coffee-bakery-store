import { prisma } from "@/lib/prisma";
import type { ModerateReviewInput } from "@/lib/validations/review";

// Prisma-запросы для /api/reviews и /api/reviews/[id] (docs/plan.md, пункт 30) — не
// путать с lib/reviews.ts (мок-данные слайдера на главной и раздела админки "Отзывы",
// пункты 7/19, ещё не переведены на Prisma). Та же логика разделения, что
// productCatalog.ts vs products.ts, orderAdmin.ts vs orders.ts.
//
// Prisma импортируется сюда, а в lib/reviews.ts — нет: оттуда тянут клиентские
// компоненты (ReviewsSlider, ReviewModerationControl), а node:-модули Prisma в их
// бандл попадать не должны (та же причина, что у lib/validations/orderStatus.ts).
export interface ApiReview {
  id: number;
  productId: number | null;
  productName: string | null; // имя связанного товара — для слайдера/карточки в админке
  authorName: string;
  quoteText: string;
  rating: number | null;
  imageUrl: string | null;
  isApproved: boolean;
  shopReply: string | null;
  createdAt: Date;
}

const apiReviewSelect = {
  id: true,
  productId: true,
  authorName: true,
  quoteText: true,
  rating: true,
  imageUrl: true,
  isApproved: true,
  shopReply: true,
  createdAt: true,
  product: { select: { name: true } },
} as const;

// Строка из Prisma с вложенным product — разворачиваем в плоский ApiReview.
interface ReviewRow {
  id: number;
  productId: number | null;
  authorName: string;
  quoteText: string;
  rating: number | null;
  imageUrl: string | null;
  isApproved: boolean;
  shopReply: string | null;
  createdAt: Date;
  product: { name: string } | null;
}

function toApiReview(row: ReviewRow): ApiReview {
  const { product, ...rest } = row;
  return { ...rest, productName: product?.name ?? null };
}

// GET /api/reviews — только одобренные отзывы для слайдера на главной (публично).
export async function getApprovedReviews(): Promise<ApiReview[]> {
  const rows = await prisma.review.findMany({
    where: { isApproved: true },
    orderBy: { createdAt: "desc" },
    select: apiReviewSelect,
  });
  return rows.map(toApiReview);
}

// PATCH /api/reviews/[id] — модерация + ответ магазина, только ADMIN. Проверка сессии
// (requireAdminSession) — в роут-хендлере, до вызова этой функции, а не внутри неё.
// null — отзыв с таким id не найден (аналог updateOrderStatus в lib/orderAdmin.ts).
export async function moderateReview(
  id: number,
  input: ModerateReviewInput
): Promise<ApiReview | null> {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  // shopReply: undefined (поля нет в теле) Prisma не трогает, null — очищает колонку.
  const row = await prisma.review.update({
    where: { id },
    data: {
      isApproved: input.isApproved,
      shopReply: input.shopReply,
    },
    select: apiReviewSelect,
  });
  return toApiReview(row);
}
