import rawMenu from "@/menu.json";
import { slugify } from "@/lib/utils";

interface RawMenuItem {
  id: number;
  name: string;
  price: number;
  currency: string;
  // null — товар без лимита количества (например, напитки: их варят на заказ)
  stock_quantity: number | null;
  image_url: string;
  volume_ml?: number;
  weight_g?: number;
  calories?: number;
  description?: string;
  composition?: string;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
}

interface RawMenuCategory {
  category: string;
  items: RawMenuItem[];
}

interface RawMenu {
  shop_name: string;
  categories: RawMenuCategory[];
}

export interface MenuProduct {
  id: number;
  name: string;
  price: number;
  currency: string;
  stockQuantity: number | null;
  imageUrl: string;
  volumeMl?: number;
  weightG?: number;
  calories?: number;
  description?: string;
  composition?: string;
  protein?: number;
  fat?: number;
  carbs?: number;
}

export interface MenuCategory {
  slug: string;
  name: string;
  products: MenuProduct[];
}

const menu = rawMenu as RawMenu;

// Одно место, где snake_case из menu.json приводится к camelCase MenuProduct —
// чтобы getCatalog и getProductById не расходились по набору полей.
function toMenuProduct(item: RawMenuItem): MenuProduct {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    currency: item.currency,
    stockQuantity: item.stock_quantity,
    imageUrl: item.image_url,
    volumeMl: item.volume_ml,
    weightG: item.weight_g,
    calories: item.calories,
    description: item.description,
    composition: item.composition,
    protein: item.protein_g,
    fat: item.fat_g,
    carbs: item.carbs_g,
  };
}

// Временный источник каталога до подключения Prisma/БД (docs/plan.md, пункты 22-25).
// Та же структура категорий/товаров, что и в menu.json, который позже станет сидом для БД —
// когда появятся Prisma-запросы, эта функция заменяется ими без изменения формы данных.
export function getCatalog(): MenuCategory[] {
  return menu.categories.map((category) => ({
    slug: slugify(category.category),
    name: category.category,
    products: category.items.map(toMenuProduct),
  }));
}

// menu.json импортируется как обычный JSON-модуль (не fs.readFile), поэтому доступен и в
// клиентских компонентах — нужен виджету корзины (CartWidget), чтобы узнать актуальный
// stockQuantity товара для лимита QtyStepper (CartItem в cartStore остаток не хранит).
export function getProductById(id: number): MenuProduct | undefined {
  for (const category of menu.categories) {
    const item = category.items.find((product) => product.id === id);
    if (item) {
      return toMenuProduct(item);
    }
  }
  return undefined;
}
