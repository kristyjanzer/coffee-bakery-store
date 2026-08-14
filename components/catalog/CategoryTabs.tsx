"use client";

import { useRef } from "react";
import { scrollToId } from "@/lib/utils";
import type { MenuCategory } from "@/lib/menu";

interface CategoryTabsProps {
  categories: MenuCategory[];
  activeSlug: string | undefined;
  onSelect: (slug: string) => void;
}

// Активный таб контролируется родителем (Catalog) — сам компонент отвечает
// только за drag-to-scroll мышкой по горизонтальному списку табов.
export function CategoryTabs({ categories, activeSlug, onSelect }: CategoryTabsProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  // Состояние драга держим в ref, а не в useState — mousemove стреляет очень часто,
  // и ре-рендер на каждый пиксель тут не нужен.
  const drag = useRef({ isDragging: false, moved: false, startX: 0, startScrollLeft: 0 });

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
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

  return (
    <div
      ref={trackRef}
      role="tablist"
      className="scrollbar-hide sticky top-20 z-30 flex h-16 cursor-grab select-none items-center gap-3 overflow-x-auto border-b border-sage-mist bg-warm-cream active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
    >
      {categories.map((category) => (
        <button
          key={category.slug}
          type="button"
          role="tab"
          aria-selected={category.slug === activeSlug}
          onClick={() => {
            // Клик в конце драга (mouseup срабатывает прямо на табе под курсором) не
            // должен ещё и переключать категорию — иначе перетаскивание "дёргается".
            if (drag.current.moved) return;
            onSelect(category.slug);
            // Если пользователь долистал длинную категорию вниз, а новая короче —
            // без этого он окажется в следующем блоке (отзывы), а не в начале секции.
            // Цель — не сам (sticky) таб-бар: у sticky-элементов scrollIntoView
            // в headless-хроме не пересчитывает позицию, скроллим к секции целиком.
            scrollToId("menu");
          }}
          className={
            category.slug === activeSlug
              ? "shrink-0 rounded-sm border border-black-olive px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              : "shrink-0 rounded-sm border border-transparent px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive/60 shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:text-black-olive"
          }
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
