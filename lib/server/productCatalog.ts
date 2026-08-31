import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { CreateProductApiInput, UpdateProductApiInput } from "@/lib/validations/product";

// Публичные Prisma-запросы для GET /api/products, /api/products/[id] (docs/plan.md,
// пункт 27) — не путать с lib/server/products.ts (мок-данные раздела админки "Товары",
// пункт 17, ещё не переведён на Prisma). Когда Server Components каталога/страницы
// товара перейдут на Prisma напрямую (пункт 35), они, вероятно, переиспользуют эти
// же функции вместо lib/shared/menu.ts.
export interface CatalogProduct {
  id: number;
  name: string;
  price: number;
  currency: string;
  stockQuantity: number | null;
  imageUrl: string | null;
  volumeMl: number | null;
  weightG: number | null;
  calories: number | null;
  description: string | null;
  composition: string | null;
  allergens: string | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  expiryInfo: string | null;
  isSeasonal: boolean;
  categoryId: number;
}

const catalogProductSelect = {
  id: true,
  name: true,
  price: true,
  currency: true,
  stockQuantity: true,
  imageUrl: true,
  volumeMl: true,
  weightG: true,
  calories: true,
  description: true,
  composition: true,
  allergens: true,
  protein: true,
  fat: true,
  carbs: true,
  expiryInfo: true,
  isSeasonal: true,
  categoryId: true,
} as const;

export async function getProducts(): Promise<CatalogProduct[]> {
  return prisma.product.findMany({
    orderBy: { id: "asc" },
    select: catalogProductSelect,
  });
}

export async function getProductById(id: number): Promise<CatalogProduct | null> {
  return prisma.product.findUnique({
    where: { id },
    select: catalogProductSelect,
  });
}

export type ProductMutationResult =
  | { ok: true; product: CatalogProduct }
  | { ok: false; error: string };

export type DeleteProductResult = { ok: true } | { ok: false; error: string };

// POST/PATCH/DELETE /api/products (пункт 27 плана) — проверка сессии администратора
// (requireAdminSession в lib/auth/auth.ts) происходит в роут-хендлере, до вызова этих
// функций, а не внутри них.
export async function createProduct(input: CreateProductApiInput): Promise<ProductMutationResult> {
  const category = await prisma.category.findUnique({ where: { slug: input.categorySlug } });
  if (!category) {
    return { ok: false, error: `Категория "${input.categorySlug}" не найдена` };
  }

  const product = await prisma.product.create({
    data: {
      name: input.name,
      price: input.price,
      currency: input.currency ?? "RUB",
      stockQuantity: input.stockQuantity ?? null,
      imageUrl: input.imageUrl ?? null,
      volumeMl: input.volumeMl ?? null,
      weightG: input.weightG ?? null,
      calories: input.calories ?? null,
      description: input.description ?? null,
      composition: input.composition ?? null,
      allergens: input.allergens ?? null,
      protein: input.protein ?? null,
      fat: input.fat ?? null,
      carbs: input.carbs ?? null,
      expiryInfo: input.expiryInfo ?? null,
      isSeasonal: input.isSeasonal ?? false,
      isActive: input.isActive ?? true,
      categoryId: category.id,
    },
    select: catalogProductSelect,
  });

  return { ok: true, product };
}

export async function updateProduct(
  id: number,
  input: UpdateProductApiInput
): Promise<ProductMutationResult> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Товар не найден" };
  }

  let categoryId: number | undefined;
  if (input.categorySlug !== undefined) {
    const category = await prisma.category.findUnique({ where: { slug: input.categorySlug } });
    if (!category) {
      return { ok: false, error: `Категория "${input.categorySlug}" не найдена` };
    }
    categoryId = category.id;
  }

  // Поля, отсутствующие в input (undefined), Prisma не трогает при update —
  // явный null (пришедший в input) при этом по-прежнему очищает колонку.
  const product = await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      price: input.price,
      currency: input.currency,
      stockQuantity: input.stockQuantity,
      imageUrl: input.imageUrl,
      volumeMl: input.volumeMl,
      weightG: input.weightG,
      calories: input.calories,
      description: input.description,
      composition: input.composition,
      allergens: input.allergens,
      protein: input.protein,
      fat: input.fat,
      carbs: input.carbs,
      expiryInfo: input.expiryInfo,
      isSeasonal: input.isSeasonal,
      isActive: input.isActive,
      categoryId,
    },
    select: catalogProductSelect,
  });

  return { ok: true, product };
}

export async function deleteProduct(id: number): Promise<DeleteProductResult> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Товар не найден" };
  }

  try {
    await prisma.product.delete({ where: { id } });
    return { ok: true };
  } catch (error) {
    // P2003 — нарушение внешнего ключа: на товар ссылаются OrderItem/Review.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { ok: false, error: "Нельзя удалить товар: на него ссылаются существующие заказы или отзывы" };
    }
    throw error;
  }
}
