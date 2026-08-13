"use client";

import { useCartStore } from "@/stores/cartStore";

interface QtyStepperProps {
  productId: number;
  name: string;
  price: number;
  imageUrl: string;
  unit: string;
  // null — товар без лимита количества (например, напитки)
  max: number | null;
  // В виджете корзины удаление — отдельная кнопка-корзина (CartWidget), поэтому "−" при
  // count === 1 там должен быть no-op, а не убирать позицию. На карточке товара (проп не
  // передан) уменьшение до 0 по-прежнему возвращает кнопку "+" — это единственный способ
  // убрать товар оттуда.
  preventRemoveAtOne?: boolean;
  // "compact" — иконка "+"/"−" (карточка товара, виджет корзины). "cta" — крупная кнопка с
  // текстом "В корзину" (Filled CTA Button из DESIGN.md) для полноэкранной страницы товара.
  variant?: "compact" | "cta";
}

// Общий компонент для карточки товара, страницы товара и виджета корзины
// (docs/architecture.md, раздел 5) — количество берётся из cartStore, а не из
// локального состояния, чтобы счётчик был единым во всех трёх местах.
export function QtyStepper({
  productId,
  name,
  price,
  imageUrl,
  unit,
  max,
  preventRemoveAtOne = false,
  variant = "compact",
}: QtyStepperProps) {
  const count = useCartStore(
    (state) => state.items.find((item) => item.productId === productId)?.quantity ?? 0
  );
  const addItem = useCartStore((state) => state.addItem);
  const incrementQty = useCartStore((state) => state.incrementQty);
  const decrementQty = useCartStore((state) => state.decrementQty);

  const isCta = variant === "cta";

  if (max !== null && max <= 0) {
    return (
      <button
        type="button"
        disabled
        aria-label="Нет в наличии"
        className={
          isCta
            ? "w-full rounded-sm bg-sage-mist/30 px-4 py-3 text-center font-venuscom text-body-sm font-semibold uppercase tracking-[0.04em] text-black-olive/30"
            : "flex size-9 items-center justify-center rounded-sm bg-sage-mist/30 text-lg font-semibold text-black-olive/30"
        }
      >
        {isCta ? "Нет в наличии" : "+"}
      </button>
    );
  }

  if (count === 0) {
    return (
      <button
        type="button"
        aria-label="Добавить в корзину"
        onClick={() => addItem({ productId, name, price, imageUrl, unit })}
        className={
          isCta
            ? "w-full rounded-sm bg-lemon-zest px-4 py-3 text-center font-venuscom text-body-sm font-semibold uppercase tracking-[0.04em] text-black-olive"
            : "flex size-9 items-center justify-center rounded-sm bg-lemon-zest text-lg font-semibold text-black-olive"
        }
      >
        {isCta ? "В корзину" : "+"}
      </button>
    );
  }

  return (
    <div
      className={
        isCta
          ? "flex h-12 items-center justify-between gap-2 rounded-sm bg-lemon-zest px-2 text-black-olive"
          : "flex h-9 items-center gap-2 rounded-sm bg-lemon-zest px-1 text-black-olive"
      }
    >
      <button
        type="button"
        aria-label="Уменьшить количество"
        disabled={preventRemoveAtOne && count === 1}
        onClick={() => decrementQty(productId)}
        className={
          isCta
            ? "flex size-9 items-center justify-center text-xl font-semibold disabled:opacity-30"
            : "flex size-7 items-center justify-center text-lg font-semibold disabled:opacity-30"
        }
      >
        −
      </button>
      <span
        className={
          isCta
            ? "min-w-[2ch] text-center font-venuscom text-body-lg font-semibold"
            : "min-w-[1.5ch] text-center font-venuscom text-body-sm font-semibold"
        }
      >
        {count}
      </span>
      <button
        type="button"
        aria-label="Увеличить количество"
        disabled={max !== null && count >= max}
        onClick={() => incrementQty(productId)}
        className={
          isCta
            ? "flex size-9 items-center justify-center text-xl font-semibold disabled:opacity-30"
            : "flex size-7 items-center justify-center text-lg font-semibold disabled:opacity-30"
        }
      >
        +
      </button>
    </div>
  );
}
