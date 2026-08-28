import { prisma } from "@/lib/prisma";
import type { ModerateReviewInput } from "@/lib/validations/review";
import type { Review } from "@/lib/reviews";

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
  productImageUrl: string | null; // фото связанного товара — источник картинки для слайдера
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
  product: { select: { name: true, imageUrl: true } },
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
  product: { name: string; imageUrl: string | null } | null;
}

function toApiReview(row: ReviewRow): ApiReview {
  const { product, ...rest } = row;
  return {
    ...rest,
    productName: product?.name ?? null,
    productImageUrl: product?.imageUrl ?? null,
  };
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

// Отзывы для слайдера на главной (docs/plan.md, пункт 7) — только одобренные,
// приведённые к форме Review, которую ждёт клиентский ReviewsSlider (productName/
// imageUrl — строки, не nullable). Server Component главной вызывает это напрямую,
// без похода в /api/reviews (docs/plan.md, пункт 35).
export async function getSliderReviews(): Promise<Review[]> {
  const rows = await getApprovedReviews();
  return rows.map((row) => ({
    id: row.id,
    authorName: row.authorName,
    quoteText: row.quoteText,
    productName: row.productName ?? "",
    // Своё фото отзыва имеет приоритет; иначе — фото связанного товара
    // (у отзыва собственного imageUrl сейчас нет, поля в модерации тоже нет).
    imageUrl: row.imageUrl || row.productImageUrl || "",
    isApproved: row.isApproved,
    shopReply: row.shopReply,
  }));
}

// --- Админка: раздел "Отзывы" (docs/plan.md, пункт 19) ---
//
// В отличие от публичной getApprovedReviews(), админке нужны все отзывы (включая
// неодобренные) — иначе их не промодерировать. Server Component списковой/детальной
// страницы вызывает это напрямую (docs/plan.md, пункт 35), мутация (модерация) —
// через PATCH /api/reviews/[id] из клиентского ReviewModerationControl.
export interface AdminReviewFilters {
  isApproved?: boolean;
}

export async function getAdminReviews(filters: AdminReviewFilters = {}): Promise<ApiReview[]> {
  const rows = await prisma.review.findMany({
    where: filters.isApproved === undefined ? undefined : { isApproved: filters.isApproved },
    orderBy: { createdAt: "desc" },
    select: apiReviewSelect,
  });
  return rows.map(toApiReview);
}

export async function getAdminReviewById(id: number): Promise<ApiReview | null> {
  const row = await prisma.review.findUnique({ where: { id }, select: apiReviewSelect });
  return row ? toApiReview(row) : null;
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

  // shopReply/imageUrl: undefined (поля нет в теле) Prisma не трогает, null — очищает
  // колонку. Пустой imageUrl → слайдер на главной покажет фото связанного товара.
  const row = await prisma.review.update({
    where: { id },
    data: {
      isApproved: input.isApproved,
      shopReply: input.shopReply,
      imageUrl: input.imageUrl,
    },
    select: apiReviewSelect,
  });
  return toApiReview(row);
}
