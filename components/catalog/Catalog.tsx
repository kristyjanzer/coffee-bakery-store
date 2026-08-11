"use client";

import { useState } from "react";
import { CategoryTabs } from "@/components/catalog/CategoryTabs";
import { ProductSection } from "@/components/catalog/ProductSection";
import type { MenuCategory } from "@/lib/menu";

interface CatalogProps {
  categories: MenuCategory[];
}

// Раньше все категории лежали одна под другой длинным списком, а таб просто
// докручивал страницу к нужной секции. По запросу пользователя — таб теперь
// показывает только свою категорию, остальные не рендерятся.
export function Catalog({ categories }: CatalogProps) {
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug);
  const activeCategory = categories.find((category) => category.slug === activeSlug);

  return (
    <>
      <CategoryTabs categories={categories} activeSlug={activeSlug} onSelect={setActiveSlug} />
      {activeCategory && (
        <div className="mt-10">
          <ProductSection category={activeCategory} />
        </div>
      )}
    </>
  );
}
