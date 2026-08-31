import { NextResponse } from "next/server";
import { getCategories } from "@/lib/server/categories";

// GET /api/categories — публичный роут для клиентских перезапросов (табы, формы
// админки), docs/architecture.md раздел "Роутинг". Server Component за категориями
// ходит в Prisma напрямую через lib/server/categories.ts, минуя этот роут.
export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/categories:", error);
    return NextResponse.json({ error: "Не удалось загрузить категории" }, { status: 500 });
  }
}
