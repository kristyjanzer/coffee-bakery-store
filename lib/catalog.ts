import { prisma } from "@/lib/prisma";
import type { MenuCategory, MenuProduct } from "@/lib/menu";

// Витрина (главная + страница товара) читает каталог напрямую из Prisma
// (docs/plan.md, пункт 35) — раньше здесь был мок из menu.json (lib/menu.ts,
// getCatalog). Форма данных (MenuCategory/MenuProduct) не меняется: компоненты
// каталога (Catalog, ProductSection, ProductCard, ProductDetail) и их тесты
// работают как есть, переключился только источник.
//
// lib/menu.ts остаётся — его getProductById() нужен клиентскому CartWidget
// (Prisma в браузерный бандл тянуть нельзя), а типы отсюда переиспользуются.

// Колонки Product, которых достаточно витрине (без "админских" allergens/
// isSeasonal/expiryInfo и служебных createdAt/updatedAt).
const menuProductSelect = {
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
  protein: true,
  fat: true,
  carbs: true,
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
  protein: number | null;
  fat: number | null;
  carbs: number | null;
}

// Prisma отдаёт необязательные колонки как null, а контракт MenuProduct —
// как `number | undefined` (пришло из формы menu.json, где поля просто
// отсутствовали). Приводим null → undefined, imageUrl null → "" (тот же
// признак "фото нет", что и в старом моке).
function toMenuProduct(row: ProductRow): MenuProduct {
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
    description: row.description ?? undefined,
    composition: row.composition ?? undefined,
    protein: row.protein ?? undefined,
    fat: row.fat ?? undefined,
    carbs: row.carbs ?? undefined,
  };
}

// Каталог для главной: категории в порядке сидирования (sortOrder = порядок в
// menu.json), внутри — только активные товары (isActive: false прячет товар с
// витрины, но не из админки). Пустые категории тоже возвращаем — секция просто
// не покажет товаров, поведение то же, что и раньше.
export async function getCatalog(): Promise<MenuCategory[]> {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      name: true,
      slug: true,
      products: {
        where: { isActive: true },
        orderBy: { id: "asc" },
        select: menuProductSelect,
      },
    },
  });

  return categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    products: category.products.map(toMenuProduct),
  }));
}

// Один товar для страницы /product/[id]. Неактивный товар отдаём как "не найден"
// (страница вызовет notFound()) — на витрине его быть не должно.
export async function getProductForDetail(id: number): Promise<MenuProduct | null> {
  const row = await prisma.product.findFirst({
    where: { id, isActive: true },
    select: menuProductSelect,
  });

  return row ? toMenuProduct(row) : null;
}
