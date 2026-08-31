"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CategoryTabs } from "@/components/catalog/CategoryTabs";
import { ProductSection } from "@/components/catalog/ProductSection";
import { CATALOG_SCROLL_KEY } from "@/lib/utils";
import type { MenuCategory } from "@/lib/shared/menu";

interface CatalogProps {
  categories: MenuCategory[];
}

const ACTIVE_CATEGORY_KEY = "catalog-active-category";

// "Подписки" нет — sessionStorage читаем один раз сразу после гидратации.
// useSyncExternalStore вместо useState+useEffect, чтобы не звать setState
// синхронно внутри эффекта (react-hooks/set-state-in-effect) — тот же приём,
// что isMounted в components/ui/Modal.tsx.
function subscribe() {
  return () => {};
}

// Раньше все категории лежали одна под другой длинным списком, а таб просто
// докручивал страницу к нужной секции. По запросу пользователя — таб теперь
// показывает только свою категорию, остальные не рендерятся.
export function Catalog({ categories }: CatalogProps) {
  const isHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug);
  const [restoredFromSession, setRestoredFromSession] = useState(false);

  // Переход на страницу товара и возврат назад: браузер восстанавливает scrollY,
  // но React-состояние (activeSlug) при этом не переживает размонтирование —
  // таб сбрасывался на первый, и восстановленная прокрутка указывала в контент
  // другой категории. sessionStorage переживает back/forward в рамках вкладки —
  // восстанавливаем выбранный таб один раз сразу после гидратации. setState
  // прямо в теле рендера (не в эффекте) — React перерисует с исправленным
  // значением до отрисовки кадра, без "мигания" неверного таба.
  if (isHydrated && !restoredFromSession) {
    setRestoredFromSession(true);
    const stored = sessionStorage.getItem(ACTIVE_CATEGORY_KEY);
    if (stored && categories.some((category) => category.slug === stored)) {
      setActiveSlug(stored);
    }
  }

  // Восстановление scrollY браузером/Next.js на кнопку "Назад" оказалось
  // ненадёжным (страница/product/[id] рендерится динамически — ƒ, не ○ в
  // выводе `next build`). Сохраняем прокрутку сами перед переходом на товар
  // (ProductCard) и возвращаем её явно здесь один раз после маунта —
  // behavior: "instant", чтобы не ловить анимацию scroll-smooth с html.
  useEffect(() => {
    const savedScrollY = sessionStorage.getItem(CATALOG_SCROLL_KEY);
    if (savedScrollY === null) return;
    sessionStorage.removeItem(CATALOG_SCROLL_KEY);
    window.scrollTo({ top: Number(savedScrollY), left: 0, behavior: "instant" });
  }, []);

  const handleSelect = (slug: string) => {
    setActiveSlug(slug);
    sessionStorage.setItem(ACTIVE_CATEGORY_KEY, slug);
  };

  const activeCategory = categories.find((category) => category.slug === activeSlug);

  return (
    <>
      <CategoryTabs categories={categories} activeSlug={activeSlug} onSelect={handleSelect} />
      {activeCategory && (
        <div className="mt-10">
          <ProductSection category={activeCategory} />
        </div>
      )}
    </>
  );
}
