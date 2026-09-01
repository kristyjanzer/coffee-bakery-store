"use client";

import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import { ReviewCard, NavArrows } from "@/components/catalog/ReviewCard";
import type { Review } from "@/lib/shared/reviews";

// Отдельный модуль ради next/dynamic(ssr:false) в ReviewsSlider: и JS Swiper
// (~40 КБ), и его CSS ("swiper/css", раньше был render-blocking) грузятся только
// когда этот чанк реально нужен — после гидратации и появления секции отзывов,
// а не в первой загрузке главной.
//
// Ручные стрелки вместо модуля Navigation из swiper/modules — так проще выдержать
// DESIGN.md "Ghost / Outlined Navigation Item", чем переопределять дефолтные
// стили Swiper-стрелок.
export function ReviewsSwiper({ reviews }: { reviews: Review[] }) {
  // Инстанс Swiper держим в state (не в ref): его появление должно перерисовать
  // NavArrows, чтобы стрелки из задизейбленных стали рабочими.
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);

  return (
    <div>
      <Swiper
        onSwiper={setSwiper}
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
            <ReviewCard review={review} />
          </SwiperSlide>
        ))}
      </Swiper>

      <NavArrows swiper={swiper} />
    </div>
  );
}
