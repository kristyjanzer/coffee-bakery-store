import { Hero } from "@/components/layout/Hero";
import { Catalog } from "@/components/catalog/Catalog";
import { ReviewsSlider } from "@/components/catalog/ReviewsSlider";
import { getCatalog } from "@/lib/server/catalog";
import { getSliderReviews } from "@/lib/server/reviewsApi";

// Каталог и отзывы правятся через админку и должны быть свежими на каждый запрос.
// Без этого Next пытается «запечь» главную на этапе `next build` (на Vercel — без
// доступа к БД) и сборка падает на prerender-е "/".
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [catalog, reviews] = await Promise.all([getCatalog(), getSliderReviews()]);

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
