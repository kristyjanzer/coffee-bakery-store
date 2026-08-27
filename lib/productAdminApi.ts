import type { ProductInput } from "@/lib/products";

// Клиентский helper для мутаций товара из админки (docs/plan.md, пункты 17/27/35).
// ProductForm — клиентский компонент, поэтому пишет через HTTP-границу
// /api/products (проверка сессии ADMIN, zod-валидация тела — в роут-хендлерах),
// а не дёргает Prisma напрямую. Тот же приём, что submitOrder() в lib/orders.ts
// и moderateReview() в lib/reviewAdminApi.ts.
export type ProductMutationResult = { ok: true } | { ok: false; error: string };

// Пустая строка из формы = "поле не заполнено" → null в БД (не пустая строка).
function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// ProductInput (строки/числа из состояния формы) → JSON-тело, которое ждёт
// createProductInputSchema / updateProductInputSchema.
function requestBody(input: ProductInput) {
  return {
    name: input.name,
    categorySlug: input.categorySlug,
    price: input.price,
    currency: input.currency,
    stockQuantity: input.stockQuantity,
    imageUrl: emptyToNull(input.imageUrl),
    volumeMl: input.volumeMl ?? null,
    weightG: input.weightG ?? null,
    calories: input.calories ?? null,
    description: emptyToNull(input.description),
    composition: emptyToNull(input.composition),
    allergens: emptyToNull(input.allergens),
    protein: input.protein,
    fat: input.fat,
    carbs: input.carbs,
    expiryInfo: emptyToNull(input.expiryInfo),
    isSeasonal: input.isSeasonal,
    isActive: input.isActive,
  };
}

async function errorFrom(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function createProduct(input: ProductInput): Promise<ProductMutationResult> {
  try {
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody(input)),
    });
    if (!response.ok) {
      return { ok: false, error: await errorFrom(response, "Не удалось создать товар.") };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Нет связи с сервером. Попробуйте ещё раз." };
  }
}

export async function updateProduct(
  id: number,
  input: ProductInput
): Promise<ProductMutationResult> {
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody(input)),
    });
    if (!response.ok) {
      return { ok: false, error: await errorFrom(response, "Не удалось сохранить товар.") };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Нет связи с сервером. Попробуйте ещё раз." };
  }
}

export async function deleteProduct(id: number): Promise<ProductMutationResult> {
  try {
    const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!response.ok) {
      // 409 — на товар ссылаются заказы/отзывы (роут отдаёт понятный текст).
      return { ok: false, error: await errorFrom(response, "Не удалось удалить товар.") };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Нет связи с сервером. Попробуйте ещё раз." };
  }
}
