import { Hero } from "@/components/layout/Hero";
import { Catalog } from "@/components/catalog/Catalog";
import { ReviewsSlider } from "@/components/catalog/ReviewsSlider";
import { getCatalog } from "@/lib/menu";
import { getReviews } from "@/lib/reviews";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function HomePage() {
  const catalog = getCatalog();
  const reviews = getReviews();

  return (
    <main>
      <Hero />
      <section id="menu" className="scroll-mt-20 bg-warm-cream px-6 py-16">
        <div className="mx-auto max-w-[1200px]">
          <Catalog categories={catalog} />
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
