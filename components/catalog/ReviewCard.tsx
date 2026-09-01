"use client";

import Image from "next/image";
import type { Swiper as SwiperInstance } from "swiper";
import { IconChevronLeft, IconChevronRight, IconImage } from "@/components/ui/icons";
import type { Review } from "@/lib/shared/reviews";

// Вынесено из ReviewsSlider.tsx: этими кусками пользуются и статичная сетка
// (SSR / до гидратации, без swiper), и динамический ReviewsSwiper. `import type`
// у Swiper стирается на сборке — swiper в бандл этого файла не попадает.

// Карточка одного отзыва — общая вёрстка для статичной сетки и для слайда Swiper.
// h-full — чтобы в сетке карточки тянулись на одну высоту.
export function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="flex h-full flex-col">
      {review.imageUrl ? (
        <div className="relative aspect-square w-full">
          <Image
            src={review.imageUrl}
            alt={review.productName}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-sage-mist/10">
          <IconImage className="size-8 text-warm-cream/30" />
        </div>
      )}

      <p className="mt-[30px] font-venuscom text-body-lg text-warm-cream">
        «{review.quoteText}»
      </p>
      <p className="mt-4 font-venuscom text-caption uppercase tracking-[0.06em] text-sage-mist">
        {review.authorName} · {review.productName}
      </p>
    </article>
  );
}

// Ряд стрелок. `swiper === null` (пока Swiper не смонтирован) — стрелки видны,
// но задизейблены: так высота блока не прыгает, когда Swiper подхватится (CLS = 0).
export function NavArrows({ swiper }: { swiper: SwiperInstance | null }) {
  const disabled = !swiper;
  return (
    <div className="mt-10 flex justify-center gap-4">
      <button
        type="button"
        aria-label="Предыдущий отзыв"
        disabled={disabled}
        onClick={() => swiper?.slidePrev()}
        className="flex size-10 items-center justify-center rounded-sm border border-pure-white text-warm-cream transition-colors hover:bg-pure-white/10 disabled:opacity-40"
      >
        <IconChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Следующий отзыв"
        disabled={disabled}
        onClick={() => swiper?.slideNext()}
        className="flex size-10 items-center justify-center rounded-sm border border-pure-white text-warm-cream transition-colors hover:bg-pure-white/10 disabled:opacity-40"
      >
        <IconChevronRight className="size-4" />
      </button>
    </div>
  );
}
