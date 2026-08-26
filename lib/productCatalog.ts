import { prisma } from "@/lib/prisma";

// Публичные Prisma-запросы для GET /api/products, /api/products/[id] (docs/plan.md,
// пункт 27) — не путать с lib/products.ts (мок-данные раздела админки "Товары",
// пункт 17, ещё не переведён на Prisma). Когда Server Components каталога/страницы
// товара перейдут на Prisma напрямую (пункт 35), они, вероятно, переиспользуют эти
// же функции вместо lib/menu.ts.
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
