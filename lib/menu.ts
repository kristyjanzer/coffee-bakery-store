import rawMenu from "@/menu.json";
import { slugify } from "@/lib/utils";

interface RawMenuItem {
  id: number;
  name: string;
  price: number;
  currency: string;
  stock_quantity: number;
  image_url: string;
  volume_ml?: number;
  weight_g?: number;
  calories?: number;
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
  stockQuantity: number;
  imageUrl: string;
  volumeMl?: number;
  weightG?: number;
  calories?: number;
}

export interface MenuCategory {
  slug: string;
  name: string;
  products: MenuProduct[];
}

const menu = rawMenu as RawMenu;

// Временный источник каталога до подключения Prisma/БД (docs/plan.md, пункты 22-25).
// Та же структура категорий/товаров, что и в menu.json, который позже станет сидом для БД —
// когда появятся Prisma-запросы, эта функция заменяется ими без изменения формы данных.
export function getCatalog(): MenuCategory[] {
  return menu.categories.map((category) => ({
    slug: slugify(category.category),
    name: category.category,
    products: category.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      currency: item.currency,
      stockQuantity: item.stock_quantity,
      imageUrl: item.image_url,
      volumeMl: item.volume_ml,
      weightG: item.weight_g,
      calories: item.calories,
    })),
  }));
}

// menu.json импортируется как обычный JSON-модуль (не fs.readFile), поэтому доступен и в
// клиентских компонентах — нужен виджету корзины (CartWidget), чтобы узнать актуальный
// stockQuantity товара для лимита QtyStepper (CartItem в cartStore остаток не хранит).
export function getProductById(id: number): MenuProduct | undefined {
  for (const category of menu.categories) {
    const item = category.items.find((product) => product.id === id);
    if (item) {
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
      };
    }
  }
  return undefined;
}
