import { prisma } from "@/lib/prisma";
import type { MenuProduct } from "@/lib/menu";

// --- Админка: раздел "Товары" (docs/plan.md, пункты 17/35) ---
//
// Читает товары напрямую из Prisma (раньше здесь был мок на основе menu.json).
// Не путать с lib/productCatalog.ts — там публичные запросы для GET /api/products;
// здесь "административный" срез: с категорией, флагами витрины и полями карточки.
// Мутации (создание/правка/удаление) идут через /api/products из клиентского
// ProductForm (lib/productAdminApi.ts), а не отсюда — HTTP-граница + проверка
// сессии ADMIN в роут-хендлере.

export interface AdminCategory {
  slug: string;
  name: string;
}

// Omit — эти поля в MenuProduct необязательные (number | undefined / string | undefined),
// а форме товара нужны строгие string / number | null; переопределяем без конфликта.
export interface AdminProduct
  extends Omit<MenuProduct, "description" | "composition" | "protein" | "fat" | "carbs"> {
  categorySlug: string;
  categoryName: string;
  description: string;
  composition: string;
  allergens: string;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  expiryInfo: string;
  isSeasonal: boolean;
  isActive: boolean;
}

// Поля, которые редактирует форма товара (без id/categoryName — id неизменяем,
// categoryName выводится из categorySlug).
export type ProductInput = Omit<AdminProduct, "id" | "categoryName">;

const adminProductSelect = {
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
  isActive: true,
  category: { select: { name: true, slug: true } },
} as const;

interface ProductRow {
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
  isActive: boolean;
  category: { name: string; slug: string };
}

// Prisma отдаёт необязательные текстовые колонки как null; форма товара работает
// со строками ("" = "не заполнено"). Числовые необязательные: volumeMl/weightG/
// calories в контракте MenuProduct — number | undefined, protein/fat/carbs —
// number | null (так их ждёт форма).
function toAdminProduct(row: ProductRow): AdminProduct {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    currency: row.currency,
    stockQuantity: row.stockQuantity,
    imageUrl: row.imageUrl ?? "",
    volumeMl: row.volumeMl ?? undefined,
    weightG: row.weightG ?? undefined,
    calories: row.calories ?? undefined,
    categorySlug: row.category.slug,
    categoryName: row.category.name,
    description: row.description ?? "",
    composition: row.composition ?? "",
    allergens: row.allergens ?? "",
    protein: row.protein,
    fat: row.fat,
    carbs: row.carbs,
    expiryInfo: row.expiryInfo ?? "",
    isSeasonal: row.isSeasonal,
    isActive: row.isActive,
  };
}

export interface ProductFilters {
  categorySlug?: string;
  seasonalOnly?: boolean;
}

export async function getAdminProducts(filters: ProductFilters = {}): Promise<AdminProduct[]> {
  const rows = await prisma.product.findMany({
    where: {
      ...(filters.categorySlug ? { category: { slug: filters.categorySlug } } : {}),
      ...(filters.seasonalOnly ? { isSeasonal: true } : {}),
    },
    orderBy: { id: "asc" },
    select: adminProductSelect,
  });
  return rows.map(toAdminProduct);
}

export async function getAdminProductById(id: number): Promise<AdminProduct | undefined> {
  const row = await prisma.product.findUnique({ where: { id }, select: adminProductSelect });
  return row ? toAdminProduct(row) : undefined;
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true },
  });
}
