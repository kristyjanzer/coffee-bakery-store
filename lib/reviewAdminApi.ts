import type { ModerateReviewInput } from "@/lib/validations/review";

// Клиентский helper для мутации отзыва из админки (docs/plan.md, пункты 19/35).
// ReviewModerationControl — клиентский компонент, поэтому пишет через HTTP-границу
// PATCH /api/reviews/[id] (проверка сессии ADMIN — там), а не дёргает Prisma напрямую.
// Тот же приём, что submitOrder() в lib/orders.ts.
export type ModerateReviewResult = { ok: true } | { ok: false; error: string };

export async function moderateReview(
  id: number,
  input: ModerateReviewInput
): Promise<ModerateReviewResult> {
  try {
    const response = await fetch(`/api/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: data?.error ?? "Не удалось сохранить модерацию." };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Нет связи с сервером. Попробуйте ещё раз." };
  }
}
