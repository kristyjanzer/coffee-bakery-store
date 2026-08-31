"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Переход на страницу с якорем (#menu/#reviews/#contacts из шапки — например,
// со страницы товара клик по «Отзывы») в App Router ненадёжен по двум причинам:
//   1. браузерное восстановление скролла ("auto") возвращает прежнюю позицию
//      этой страницы вместо секции из хэша — визуально «как будто нажал Назад»;
//   2. позднняя вёрстка (картинки next/image, инициализация слайдера отзывов)
//      сдвигает секцию уже после того, как Next один раз проскроллил.
// Здесь принудительно доводим до якоря — сразу и с парой повторов, пока грузится
// контент; как только пользователь сам тронул скролл, перестаём вмешиваться.
export function AnchorScrollFix() {
  const pathname = usePathname();

  useEffect(() => {
    if (!window.location.hash) return;

    let stopped = false;
    const release = () => {
      stopped = true;
    };

    const scrollToAnchor = () => {
      if (stopped) return;
      const id = decodeURIComponent(window.location.hash.replace("#", ""));
      if (!id) return;
      // block: "start" + scroll-mt-* на секциях уводит из-под липкой шапки;
      // "instant" — без анимации: страница уже сменилась, доводка должна быть незаметной.
      document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
    };

    window.addEventListener("wheel", release, { passive: true, once: true });
    window.addEventListener("touchmove", release, { passive: true, once: true });
    window.addEventListener("keydown", release, { once: true });

    const raf = requestAnimationFrame(scrollToAnchor);
    const timers = [120, 350, 700].map((delay) => setTimeout(scrollToAnchor, delay));

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchmove", release);
      window.removeEventListener("keydown", release);
    };
  }, [pathname]);

  return null;
}
