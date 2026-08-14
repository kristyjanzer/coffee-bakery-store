import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { getAdminCategories, getAdminProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Товары — Coffee Bakery",
};

interface ProductsPageProps {
  searchParams: Promise<{ category?: string; seasonal?: string }>;
}

function buildHref(category: string | undefined, seasonalOnly: boolean) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (seasonalOnly) params.set("seasonal", "1");
  const query = params.toString();
  return query ? `/admin/products?${query}` : "/admin/products";
}

// Список товаров с фильтрами по категории и сезонности (docs/plan.md, пункт 17;
// about-project.md, раздел "Товары"). Фильтры — обычные ссылки с query-параметрами,
// без клиентского JS: Server Component сам перечитывает список (тот же приём, что
// ?status= в /admin/orders).
export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  const { category: activeCategory, seasonal } = await searchParams;
  const seasonalOnly = seasonal === "1";
  const [categories, products] = await Promise.all([
    getAdminCategories(),
    getAdminProducts({ categorySlug: activeCategory, seasonalOnly }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">
          Товары
        </h1>
        <Link
          href="/admin/products/new"
          className="rounded-sm bg-lemon-zest px-4 py-3 font-venuscom text-body-sm font-semibold uppercase text-black-olive hover:opacity-90"
        >
          + Добавить товар
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3" role="tablist">
          <Link
            href={buildHref(undefined, seasonalOnly)}
            role="tab"
            aria-selected={!activeCategory}
            className={
              !activeCategory
                ? "rounded-sm border border-black-olive px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                : "rounded-sm border border-transparent px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive/60 shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:text-black-olive"
            }
          >
            Все категории
          </Link>
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={buildHref(category.slug, seasonalOnly)}
              role="tab"
              aria-selected={activeCategory === category.slug}
              className={
                activeCategory === category.slug
                  ? "rounded-sm border border-black-olive px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                  : "rounded-sm border border-transparent px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive/60 shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:text-black-olive"
              }
            >
              {category.name}
            </Link>
          ))}
        </div>

        <Link
          href={buildHref(activeCategory, !seasonalOnly)}
          aria-pressed={seasonalOnly}
          className={
            seasonalOnly
              ? "rounded-sm border border-forest-ink px-4 py-2 font-venuscom text-body-sm uppercase text-forest-ink"
              : "rounded-sm border border-sage-mist px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive/60 hover:text-black-olive"
          }
        >
          Только сезонные/акционные
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="font-venuscom text-body-sm text-black-olive/70">Товаров с такими фильтрами пока нет.</p>
      ) : (
        <div className="overflow-x-auto bg-warm-cream shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-sage-mist">
                {["Фото", "Название", "Категория", "Цена", "Остаток", "Метки"].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-[15px] py-3 font-venuscom text-caption uppercase text-black-olive/60"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-sage-mist last:border-0">
                  <td className="px-[15px] py-3">
                    <div className="relative size-12 shrink-0 overflow-hidden bg-sage-mist/20">
                      {product.imageUrl && (
                        <Image src={product.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                      )}
                    </div>
                  </td>
                  <td className="px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    <Link href={`/admin/products/${product.id}`} className="hover:underline">
                      {product.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive/70">
                    {product.categoryName}
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm font-semibold text-black-olive">
                    {formatPrice(product.price, product.currency)}
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive/70">
                    {product.stockQuantity === null ? "Без лимита" : product.stockQuantity}
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {product.isSeasonal && (
                        <span className="rounded-sm bg-sage-mist/30 px-2 py-1 font-venuscom text-caption uppercase text-forest-ink">
                          Сезонный
                        </span>
                      )}
                      {!product.isActive && (
                        <span className="rounded-sm bg-red-500/10 px-2 py-1 font-venuscom text-caption uppercase text-red-600">
                          Неактивен
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
