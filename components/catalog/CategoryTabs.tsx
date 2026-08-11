"use client";

import { useEffect, useRef, useState } from "react";
import { scrollToId } from "@/lib/utils";
import type { MenuCategory } from "@/lib/menu";

interface CategoryTabsProps {
  categories: MenuCategory[];
}

// Скролл-спай (какая секция сейчас в зоне видимости) + клик-прокрутка (вручную
// через scrollToId — см. её комментарий в lib/utils.ts)
export function CategoryTabs({ categories }: CategoryTabsProps) {
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug);
  const trackRef = useRef<HTMLDivElement>(null);
  // Состояние драга держим в ref, а не в useState — mousemove стреляет очень часто,
  // и ре-рендер на каждый пиксель тут не нужен.
  const drag = useRef({ isDragging: false, moved: false, startX: 0, startScrollLeft: 0 });

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    // Иначе браузер стартует нативный drag ссылки (таб — это <a>) вместо нашего скролла.
    event.preventDefault();
    drag.current = {
      isDragging: true,
      moved: false,
      startX: event.pageX,
      startScrollLeft: track.scrollLeft,
    };
  };

  const stopDragging = () => {
    drag.current.isDragging = false;
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || !drag.current.isDragging) return;
    event.preventDefault();
    const delta = event.pageX - drag.current.startX;
    // Порог в 5px отделяет реальный драг от лёгкой дрожи руки при обычном клике по табу.
    if (Math.abs(delta) > 5) drag.current.moved = true;
    track.scrollLeft = drag.current.startScrollLeft - delta;
  };

  useEffect(() => {
    const sections = categories
      .map((category) => document.getElementById(category.slug))
      .filter((element): element is HTMLElement => element !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const topMostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (topMostVisible) {
          setActiveSlug(topMostVisible.target.id);
        }
      },
      { rootMargin: "-100px 0px -70% 0px" }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [categories]);

  return (
    <div
      ref={trackRef}
      className="scrollbar-hide sticky top-20 z-30 flex h-16 cursor-grab select-none items-center gap-3 overflow-x-auto bg-warm-cream active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
    >
      {categories.map((category) => (
        <a
          key={category.slug}
          href={`#${category.slug}`}
          onClick={(event) => {
            event.preventDefault();
            // Клик в конце драга (mouseup срабатывает прямо на табе под курсором) не
            // должен ещё и скроллить к секции — иначе перетаскивание "дёргается".
            if (drag.current.moved) return;
            scrollToId(category.slug);
          }}
          className={
            category.slug === activeSlug
              ? "shrink-0 rounded-sm border border-black-olive px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive"
              : "shrink-0 rounded-sm px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive/60 hover:text-black-olive"
          }
        >
          {category.name}
        </a>
      ))}
    </div>
  );
}
