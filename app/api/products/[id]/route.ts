import { NextResponse } from "next/server";
import { getProductById, updateProduct, deleteProduct } from "@/lib/server/productCatalog";
import { updateProductInputSchema } from "@/lib/validations/product";
import { requireAdminSession } from "@/lib/auth/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseProductId(id: string): number | null {
  const productId = Number(id);
  return Number.isInteger(productId) ? productId : null;
}

// GET /api/products/[id] — публичные детали товара (docs/plan.md, пункт 27).
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const productId = parseProductId(id);

  if (productId === null) {
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

// PATCH /api/products/[id] — изменение товара, только ADMIN (docs/plan.md, пункт 27).
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  const { id } = await params;
  const productId = parseProductId(id);
  if (productId === null) {
    return NextResponse.json({ error: "Некорректный id товара" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = updateProductInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные данные товара", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await updateProduct(productId, parsed.data);
    if (!result.ok) {
      const status = result.error === "Товар не найден" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result.product);
  } catch (error) {
    console.error("PATCH /api/products/[id]:", error);
    return NextResponse.json({ error: "Не удалось изменить товар" }, { status: 500 });
  }
}

// DELETE /api/products/[id] — удаление товара, только ADMIN (docs/plan.md, пункт 27).
export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  const { id } = await params;
  const productId = parseProductId(id);
  if (productId === null) {
    return NextResponse.json({ error: "Некорректный id товара" }, { status: 400 });
  }

  try {
    const result = await deleteProduct(productId);
    if (!result.ok) {
      const status = result.error === "Товар не найден" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/products/[id]:", error);
    return NextResponse.json({ error: "Не удалось удалить товар" }, { status: 500 });
  }
}
