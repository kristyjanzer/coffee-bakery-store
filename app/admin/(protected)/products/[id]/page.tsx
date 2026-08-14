import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminCategories, getAdminProductById } from "@/lib/products";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "Редактирование товара — Coffee Bakery",
};

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

// Редактирование товара (docs/plan.md, пункт 17). ProductForm сама вызывает
// updateProduct()/deleteProduct() (заглушки, lib/products.ts) и редиректит на
// список после "сохранения"/удаления.
export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const productId = Number(id);
  const [categories, product] = await Promise.all([
    getAdminCategories(),
    Number.isNaN(productId) ? undefined : getAdminProductById(productId),
  ]);

  if (!product) {
    notFound();
  }

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
          {product.name}
        </h1>
      </div>

      <ProductForm categories={categories} product={product} />
    </div>
  );
}
