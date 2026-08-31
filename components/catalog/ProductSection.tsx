import { ProductCard } from "@/components/catalog/ProductCard";
import type { MenuCategory } from "@/lib/shared/menu";

interface ProductSectionProps {
  category: MenuCategory;
}

export function ProductSection({ category }: ProductSectionProps) {
  return (
    <section>
      <h2 className="font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">
        {category.name}
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-x-[30px] gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {category.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
