"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import { IconChevronLeft, IconChevronRight, IconImage } from "@/components/ui/icons";
import "swiper/css";
import type { Review } from "@/lib/shared/reviews";

interface ReviewsSliderProps {
  reviews: Review[];
}

// Карточка одного отзыва — общая вёрстка для статичной сетки (SSR / до гидратации)
// и для слайда внутри Swiper. h-full — чтобы в сетке карточки тянулись на одну высоту.
function ReviewCard({ review }: { review: Review }) {
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
function NavArrows({ swiper }: { swiper: SwiperInstance | null }) {
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

// getSnapshot возвращает true в браузере и false на сервере / в первом рендере
// клиента (до гидратации). subscribe-заглушка: значение после гидратации уже не
// меняется. Так React-way определяем «мы на клиенте» без setState-в-эффекте
// (его запрещает react-hooks/set-state-in-effect).
const subscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

// Ручные стрелки вместо модуля Navigation из swiper/modules — так проще выдержать
// DESIGN.md "Ghost / Outlined Navigation Item" (прозрачный фон, белая обводка 1px,
// rounded-sm), чем переопределять дефолтные стили Swiper-стрелок.
export function ReviewsSlider({ reviews }: ReviewsSliderProps) {
  // Инстанс Swiper держим в state (не в ref): его появление должно перерисовать
  // NavArrows, чтобы стрелки из задизейбленных стали рабочими.
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);

  // false на сервере и в первом рендере клиента → отдаём статичную сетку.
  // Становится true после гидратации всей страницы — тогда монтируем Swiper. До
  // этого пользователь видит корректную сетку 3-в-ряд, а не «сырую» вертикаль из
  // всех слайдов с растянутой на весь экран картинкой, пока грузится и
  // инициализируется JS Swiper (в dev + StrictMode это окно — секунды; на слабом
  // устройстве больше, и перезагрузка до конца инициализации выглядит как
  // «слайдер завис одним слайдом»).
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
