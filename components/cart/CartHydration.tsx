"use client";

import { useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";

// cartStore создан со skipHydration: true (docs/architecture.md, раздел 4) — на сервере
// и при первом клиентском рендере стор всегда пустой, поэтому гидратация не расходится.
// Реальные данные из localStorage подтягиваются один раз здесь после маунта; все компоненты,
// подписанные на useCartStore (QtyStepper, CartIcon, CartWidget), сами перерендерятся.
export function CartHydration() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);

  return null;
}
