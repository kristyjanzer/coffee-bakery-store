import { ProductCard } from "@/components/catalog/ProductCard";
import type { MenuCategory } from "@/lib/menu";

interface ProductSectionProps {
  category: MenuCategory;
}

// scroll-mt-36 (144px) = Header (h-20/80px) + CategoryTabs (h-16/64px), которые оба sticky
// друг под другом — иначе заголовок секции при переходе по якорю прячется под ними
export function ProductSection({ category }: ProductSectionProps) {
  return (
    <section id={category.slug} className="scroll-mt-36">
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
