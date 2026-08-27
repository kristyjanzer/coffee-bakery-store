import { z } from "zod";

// Тело запроса PATCH /api/reviews/[id] (docs/plan.md, пункт 30) — модерация отзыва
// (одобрен / на модерации) и ответ от имени магазина (about-project.md, раздел
// "Отзывы": "Модерация отзывов", "Ответы от имени магазина").
//
// Чистый zod, без импорта Prisma-клиента: этот файл может понадобиться клиентскому
// ReviewModerationControl (как lib/validations/order.ts в CheckoutForm), а серверный
// node:-код Prisma в клиентский бандл попадать не должен.
export const moderateReviewSchema = z.object({
  // Ставится всегда — сам смысл действия "промодерировать" в переключении этого флага.
  isApproved: z.boolean(),
  // null — явно убрать ответ, отсутствие поля — не менять (semantics Prisma .update()).
  shopReply: z.string().trim().max(2000, "Ответ слишком длинный").nullable().optional(),
});

export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
