"use client";

import { useCartStore } from "@/stores/cartStore";

interface QtyStepperProps {
  productId: number;
  name: string;
  price: number;
  imageUrl: string;
  unit: string;
  max: number;
}

// Общий компонент для карточки товара, страницы товара и виджета корзины
// (docs/architecture.md, раздел 5) — количество берётся из cartStore, а не из
// локального состояния, чтобы счётчик был единым во всех трёх местах.
export function QtyStepper({ productId, name, price, imageUrl, unit, max }: QtyStepperProps) {
  const count = useCartStore(
    (state) => state.items.find((item) => item.productId === productId)?.quantity ?? 0
  );
  const addItem = useCartStore((state) => state.addItem);
  const incrementQty = useCartStore((state) => state.incrementQty);
  const decrementQty = useCartStore((state) => state.decrementQty);

  if (max <= 0) {
    return (
      <button
        type="button"
        disabled
        aria-label="Нет в наличии"
        className="flex h-9 w-9 items-center justify-center rounded-sm bg-sage-mist/30 text-lg font-semibold text-black-olive/30"
      >
        +
      </button>
    );
  }

  if (count === 0) {
    return (
      <button
        type="button"
        aria-label="Добавить в корзину"
        onClick={() => addItem({ productId, name, price, imageUrl, unit })}
        className="flex h-9 w-9 items-center justify-center rounded-sm bg-lemon-zest text-lg font-semibold text-black-olive"
      >
        +
      </button>
    );
  }

  return (
    <div className="flex h-9 items-center gap-2 rounded-sm bg-lemon-zest px-1 text-black-olive">
      <button
        type="button"
        aria-label="Уменьшить количество"
        onClick={() => decrementQty(productId)}
        className="flex h-7 w-7 items-center justify-center text-lg font-semibold"
      >
        −
      </button>
      <span className="min-w-[1.5ch] text-center font-venuscom text-body-sm font-semibold">
        {count}
      </span>
      <button
        type="button"
        aria-label="Увеличить количество"
        disabled={count >= max}
        onClick={() => incrementQty(productId)}
        className="flex h-7 w-7 items-center justify-center text-lg font-semibold disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
