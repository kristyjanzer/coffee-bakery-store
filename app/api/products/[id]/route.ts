import { NextResponse } from "next/server";
import { getProductById } from "@/lib/productCatalog";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/products/[id] — публичные детали товара (docs/plan.md, пункт 27).
// PATCH/DELETE (админ) появятся вместе с NextAuth (пункт 31).
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Некорректный id товара" }, { status: 400 });
  }

  try {
    const product = await getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error("GET /api/products/[id]:", error);
    return NextResponse.json({ error: "Не удалось загрузить товар" }, { status: 500 });
  }
}
