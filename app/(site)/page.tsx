import { Hero } from "@/components/layout/Hero";
import { CategoryTabs } from "@/components/catalog/CategoryTabs";
import { ProductSection } from "@/components/catalog/ProductSection";
import { ReviewsSlider } from "@/components/catalog/ReviewsSlider";
import { getCatalog } from "@/lib/menu";
import { getReviews } from "@/lib/reviews";

export default function HomePage() {
  const catalog = getCatalog();
  const reviews = getReviews();

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
      <section id="reviews" className="scroll-mt-20 bg-black-olive px-6 py-16">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="font-venuscom text-heading-sm uppercase tracking-[0.03em] text-warm-cream">
            Отзывы
          </h2>
          <div className="mt-8">
            <ReviewsSlider reviews={reviews} />
          </div>
        </div>
      </section>
    </main>
  );
}
