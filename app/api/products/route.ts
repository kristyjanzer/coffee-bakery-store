import { NextResponse } from "next/server";
import { getProducts, createProduct } from "@/lib/productCatalog";
import { createProductInputSchema } from "@/lib/validations/product";
import { requireAdminSession } from "@/lib/auth";

// GET /api/products — публичный список товаров (docs/plan.md, пункт 27).
export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products:", error);
    return NextResponse.json({ error: "Не удалось загрузить товары" }, { status: 500 });
  }
}

// POST /api/products — создание товара, только ADMIN (docs/plan.md, пункт 27;
// docs/architecture.md, раздел 7 — проверка сессии до обращения к Prisma).
export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = createProductInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные данные товара", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await createProduct(parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.product, { status: 201 });
  } catch (error) {
    console.error("POST /api/products:", error);
    return NextResponse.json({ error: "Не удалось создать товар" }, { status: 500 });
  }
}
