"use client";

import { useState } from "react";

interface QtyStepperProps {
  max: number;
}

// Пока без cartStore (появится в задаче 8 плана) — количество живёт только в
// локальном состоянии карточки. В корзину товар пока не попадает.
export function QtyStepper({ max }: QtyStepperProps) {
  const [count, setCount] = useState(0);

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
        onClick={() => setCount(1)}
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
        onClick={() => setCount((prev) => prev - 1)}
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
        onClick={() => setCount((prev) => prev + 1)}
        className="flex h-7 w-7 items-center justify-center text-lg font-semibold disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
