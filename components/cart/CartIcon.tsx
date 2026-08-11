"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";
import { useCartStore, selectTotalCount } from "@/stores/cartStore";

export function CartIcon() {
  const totalCount = useCartStore(selectTotalCount);
  const openWidget = useCartStore((state) => state.openWidget);

  return (
    <button
      type="button"
      aria-label="Открыть корзину"
      onClick={openWidget}
      className="relative text-warm-cream"
    >
      <FontAwesomeIcon icon={faCartShopping} className="h-5 w-5" />
      {totalCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-sm bg-lemon-zest px-1 font-venuscom text-caption font-semibold leading-none text-black-olive">
          {totalCount}
        </span>
      )}
    </button>
  );
}
