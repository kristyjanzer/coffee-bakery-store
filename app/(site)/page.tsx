import { Hero } from "@/components/layout/Hero";
import { CategoryTabs } from "@/components/catalog/CategoryTabs";
import { ProductSection } from "@/components/catalog/ProductSection";
import { getCatalog } from "@/lib/menu";

// Отзывы появятся здесь следующей задачей (docs/plan.md, пункт 7)
export default function HomePage() {
  const catalog = getCatalog();

  return (
    <main>
      <Hero />
      <section id="menu" className="scroll-mt-20 bg-warm-cream px-6 py-16">
        <div className="mx-auto max-w-[1200px]">
          <CategoryTabs categories={catalog} />
          <div className="mt-10 flex flex-col gap-16">
            {catalog.map((category) => (
              <ProductSection key={category.slug} category={category} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
