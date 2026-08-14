import type { Metadata } from "next";
import Link from "next/link";
import { getAdminCategories } from "@/lib/products";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "Новый товар — Кофейня-пекарня",
};

// Создание товара (docs/plan.md, пункт 17). ProductForm сама вызывает createProduct()
// (заглушка, lib/products.ts) и редиректит на список после "сохранения".
export default async function NewProductPage() {
  const categories = await getAdminCategories();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/admin/products"
          className="font-venuscom text-caption text-black-olive/60 hover:text-black-olive hover:underline"
        >
          ← Все товары
        </Link>
        <h1 className="mt-2 font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">
          Новый товар
        </h1>
      </div>

      <ProductForm categories={categories} />
    </div>
  );
}
