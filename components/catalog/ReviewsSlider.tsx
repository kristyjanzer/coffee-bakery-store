"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { ReviewCard, NavArrows } from "@/components/catalog/ReviewCard";
import type { Review } from "@/lib/shared/reviews";

interface ReviewsSliderProps {
  reviews: Review[];
}

// Swiper (JS + CSS) уезжает в отдельный чанк и грузится только на клиенте после
// гидратации — на первой загрузке главной его нет вовсе (раньше "swiper/css"
// блокировал первую отрисовку). До подгрузки показываем статичную сетку.
const ReviewsSwiper = dynamic(
  () => import("@/components/catalog/ReviewsSwiper").then((m) => m.ReviewsSwiper),
  { ssr: false }
);

// getSnapshot возвращает true в браузере и false на сервере / в первом рендере
// клиента (до гидратации). subscribe-заглушка: значение после гидратации уже не
// меняется. Так React-way определяем «мы на клиенте» без setState-в-эффекте
// (его запрещает react-hooks/set-state-in-effect).
const subscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

export function ReviewsSlider({ reviews }: ReviewsSliderProps) {
  // false на сервере и в первом рендере клиента → отдаём статичную сетку.
  // Становится true после гидратации всей страницы — тогда монтируем Swiper. До
  // этого пользователь видит корректную сетку 3-в-ряд, а не «сырую» вертикаль из
  // всех слайдов с растянутой на весь экран картинкой.
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div>
        {/* Первые 3 отзыва — столько же, сколько показывает Swiper на десктопе. */}
        <div className="grid gap-[30px] sm:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 3).map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
        <NavArrows swiper={null} />
      </div>
    );
  }

  return <ReviewsSwiper reviews={reviews} />;
}
