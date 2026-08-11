"use client";

import { useEffect, useState } from "react";
import { scrollToId } from "@/lib/utils";
import type { MenuCategory } from "@/lib/menu";

interface CategoryTabsProps {
  categories: MenuCategory[];
}

// Скролл-спай (какая секция сейчас в зоне видимости) + клик-прокрутка (вручную
// через scrollToId — см. её комментарий в lib/utils.ts)
export function CategoryTabs({ categories }: CategoryTabsProps) {
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug);

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
    <div className="sticky top-20 z-30 flex h-16 items-center gap-3 overflow-x-auto bg-warm-cream">
      {categories.map((category) => (
        <a
          key={category.slug}
          href={`#${category.slug}`}
          onClick={(event) => {
            event.preventDefault();
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
