import { getCatalog, type MenuProduct } from "@/lib/menu";

// --- Админка: раздел "Товары" (docs/plan.md, пункт 17) ---
//
// Product в Prisma появится только в пунктах 22-25 плана, поэтому источник — тот же
// getCatalog() (lib/menu.ts, реальные товары/фото/остатки из menu.json), дополненный
// полями из Prisma-схемы Product (docs/architecture.md, раздел 3), которых пока нет
// в menu.json: description/composition/allergens/protein/fat/carbs/expiryInfo.
// Как и на странице товара (задача 20), не выдумываем факты о еде — эти поля
// стартуют пустыми/null, админ заполняет их сам через форму. isActive/isSeasonal —
// не факты о товаре, а операционные флаги витрины, поэтому по аналогии с
// getTopProducts() в lib/dashboard.ts (задача 29, мок unitsSold поверх реальных
// товаров) для них допустимы иллюстративные значения по умолчанию.
//
// Сигнатуры уже async/Promise — тихая замена на Prisma-запросы без переделки
// страниц/форм, как lib/orders.ts для раздела "Заказы".

export interface AdminCategory {
  slug: string;
  name: string;
}

export interface AdminProduct extends MenuProduct {
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

// Иллюстративный набор "сезонных" товаров — в menu.json признака сезонности нет ни
// у одного товара (это будущее поле Prisma-схемы), нужен хотя бы один пример, чтобы
// фильтр "Сезонные" на списке было на чём проверить.
const SEASONAL_PRODUCT_IDS = new Set([76, 126, 128]);

function buildAdminProducts(): AdminProduct[] {
  const products: AdminProduct[] = [];
  for (const category of getCatalog()) {
    for (const product of category.products) {
      products.push({
        ...product,
        categorySlug: category.slug,
        categoryName: category.name,
        description: "",
        composition: "",
        allergens: "",
        protein: null,
        fat: null,
        carbs: null,
        expiryInfo: "",
        isSeasonal: SEASONAL_PRODUCT_IDS.has(product.id),
        isActive: true,
      });
    }
  }
  return products;
}

const ADMIN_PRODUCTS = buildAdminProducts();

export interface ProductFilters {
  categorySlug?: string;
  seasonalOnly?: boolean;
}

export async function getAdminProducts(filters: ProductFilters = {}): Promise<AdminProduct[]> {
  return ADMIN_PRODUCTS.filter((product) => {
    if (filters.categorySlug && product.categorySlug !== filters.categorySlug) return false;
    if (filters.seasonalOnly && !product.isSeasonal) return false;
    return true;
  });
}

export async function getAdminProductById(id: number): Promise<AdminProduct | undefined> {
  return ADMIN_PRODUCTS.find((product) => product.id === id);
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  return getCatalog().map((category) => ({ slug: category.slug, name: category.name }));
}

// Заглушки: POST/PATCH/DELETE /api/products (пункт 27 плана) ещё не существуют.
// Не мутируют ADMIN_PRODUCTS (нет реального хранилища) — тот же принцип, что
// updateOrderStatus() в lib/orders.ts: вызывающий компонент сам держит новое
// состояние локально, обновление страницы вернёт мок-значения.
export function createProduct(input: ProductInput): Promise<{ success: true }> {
  void input;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 500);
  });
}

export function updateProduct(id: number, input: ProductInput): Promise<{ success: true }> {
  void id;
  void input;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 500);
  });
}

export function deleteProduct(id: number): Promise<{ success: true }> {
  void id;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 500);
  });
}
