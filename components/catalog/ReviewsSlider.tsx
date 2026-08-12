"use client";

import { useRef } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faImage } from "@fortawesome/free-solid-svg-icons";
import "swiper/css";
import type { Review } from "@/lib/reviews";

interface ReviewsSliderProps {
  reviews: Review[];
}

// Ручные стрелки вместо модуля Navigation из swiper/modules — так проще выдержать
// DESIGN.md "Ghost / Outlined Navigation Item" (прозрачный фон, белая обводка 1px,
// rounded-sm), чем переопределять дефолтные стили Swiper-стрелок.
export function ReviewsSlider({ reviews }: ReviewsSliderProps) {
  const swiperRef = useRef<SwiperInstance | null>(null);

  return (
    <div>
      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        spaceBetween={30}
        slidesPerView={1}
        loop
        breakpoints={{
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
        }}
      >
        {reviews.map((review) => (
          <SwiperSlide key={review.id}>
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
                  <FontAwesomeIcon icon={faImage} className="size-8 text-warm-cream/30" />
                </div>
              )}

              <p className="mt-[30px] font-venuscom text-body-lg text-warm-cream">
                «{review.quoteText}»
              </p>
              <p className="mt-4 font-venuscom text-caption uppercase tracking-[0.06em] text-sage-mist">
                {review.authorName} · {review.productName}
              </p>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="mt-10 flex justify-center gap-4">
        <button
          type="button"
          aria-label="Предыдущий отзыв"
          onClick={() => swiperRef.current?.slidePrev()}
          className="flex size-10 items-center justify-center rounded-sm border border-pure-white text-warm-cream transition-colors hover:bg-pure-white/10"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Следующий отзыв"
          onClick={() => swiperRef.current?.slideNext()}
          className="flex size-10 items-center justify-center rounded-sm border border-pure-white text-warm-cream transition-colors hover:bg-pure-white/10"
        >
          <FontAwesomeIcon icon={faChevronRight} className="size-4" />
        </button>
      </div>
    </div>
  );
}
