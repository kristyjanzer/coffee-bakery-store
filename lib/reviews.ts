// Форма отзыва, которую потребляет клиентский ReviewsSlider на главной. Раньше в
// этом файле жил мок из 7 отзывов + заглушки для админки — теперь отзывы читаются
// из Prisma (lib/reviewsApi.ts: getSliderReviews / getAdminReviews), а данные
// приходят из сид-фикстуры (prisma/seed.ts, seedReviews). Файл оставлен как
// type-only: ReviewsSlider тянут в клиентский бандл, node:-модули Prisma туда
// попадать не должны (та же причина, что у lib/validations/orderStatus.ts).
export interface Review {
  id: number;
  authorName: string;
  quoteText: string;
  productName: string;
  imageUrl: string;
  isApproved: boolean;
  shopReply: string | null;
}
