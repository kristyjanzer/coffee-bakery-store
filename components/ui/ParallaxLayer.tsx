"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ParallaxLayerProps {
  children: ReactNode;
  maxShift?: number;
}

// Смещает содержимое по вертикали пропорционально прогрессу прокрутки ближайшей
// <section> (0 — секция у верха экрана, 1 — полностью ушла вверх), создавая эффект
// параллакса. Слушатель scroll включён только пока секция в зоне видимости
// (IntersectionObserver) — не создаёт лишней работы на длинной странице каталога.
// Обёртка должна лежать внутри relative + overflow-hidden родителя; ребёнок —
// быть слегка крупнее контейнера (напр. scale-125), чтобы сдвиг не открывал края.
export function ParallaxLayer({ children, maxShift = 80 }: ParallaxLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const section = layer?.closest("section");
    if (!layer || !section) return;

    let frame = 0;

    function updateTransform() {
      if (!layer || !section) return;
      const rect = section.getBoundingClientRect();
      const progress = Math.min(Math.max(-rect.top / rect.height, 0), 1);
      layer.style.transform = `translate3d(0, ${progress * maxShift}px, 0)`;
    }

    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateTransform);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          updateTransform();
          window.addEventListener("scroll", onScroll, { passive: true });
        } else {
          window.removeEventListener("scroll", onScroll);
        }
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(section);

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [maxShift]);

  return (
    <div ref={layerRef} className="absolute inset-0 will-change-transform">
      {children}
    </div>
  );
}
