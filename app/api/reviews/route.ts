import { NextResponse } from "next/server";
import { getApprovedReviews } from "@/lib/server/reviewsApi";

// GET /api/reviews — публичный список одобренных отзывов для слайдера на главной
// (docs/plan.md, пункт 30; docs/architecture.md, "Роутинг"). Server Component
// слайдера позже пойдёт в Prisma напрямую (пункт 35), минуя этот роут — он нужен
// для клиентских перезапросов.
export async function GET() {
  try {
    const reviews = await getApprovedReviews();
    return NextResponse.json(reviews);
  } catch (error) {
    console.error("GET /api/reviews:", error);
    return NextResponse.json({ error: "Не удалось загрузить отзывы" }, { status: 500 });
  }
}
