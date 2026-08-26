import { NextResponse } from "next/server";
import { getProducts } from "@/lib/productCatalog";

// GET /api/products — публичный список товаров (docs/plan.md, пункт 27). POST
// (создание, админ) появится вместе с NextAuth (пункт 31, см. docs/architecture.md
// раздел "Авторизация" — мутирующие роуты обязаны проверять сессию до Prisma).
export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products:", error);
    return NextResponse.json({ error: "Не удалось загрузить товары" }, { status: 500 });
  }
}
