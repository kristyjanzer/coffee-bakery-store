import { NextResponse } from "next/server";
import { moderateReview } from "@/lib/server/reviewsApi";
import { moderateReviewSchema } from "@/lib/validations/review";
import { requireAdminSession } from "@/lib/auth/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseReviewId(id: string): number | null {
  const reviewId = Number(id);
  return Number.isInteger(reviewId) ? reviewId : null;
}

// PATCH /api/reviews/[id] — модерация отзыва и ответ магазина, только ADMIN
// (docs/plan.md, пункт 30; docs/architecture.md, "Роутинг"). Роль ORDER_MANAGER
// сюда не пускаем — она про заказы, не про контент (см. lib/auth/auth.ts).
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  const { id } = await params;
  const reviewId = parseReviewId(id);
  if (reviewId === null) {
    return NextResponse.json({ error: "Некорректный id отзыва" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = moderateReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные данные модерации", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const review = await moderateReview(reviewId, parsed.data);
    if (!review) {
      return NextResponse.json({ error: "Отзыв не найден" }, { status: 404 });
    }
    return NextResponse.json(review);
  } catch (error) {
    console.error("PATCH /api/reviews/[id]:", error);
    return NextResponse.json({ error: "Не удалось сохранить модерацию" }, { status: 500 });
  }
}
