import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  // Подпись веса/объёма под названием — та же строка, что ProductCard/ProductDetail
  // показывают под товаром ("400 мл" / "220 г"), нужна для виджета корзины.
  unit: string;
}

interface CartState {
  items: CartItem[];
  isWidgetOpen: boolean;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: number) => void;
  incrementQty: (productId: number) => void;
  decrementQty: (productId: number) => void;
  clearCart: () => void;
  openWidget: () => void;
  closeWidget: () => void;
}

// docs/architecture.md, раздел 4: только клиент, персистится в localStorage.
// skipHydration — стор на сервере и при первом клиентском рендере всегда стартует
// пустым (items: []), без рассинхронизации гидратации; реальные данные из localStorage
// подтягиваются вручную через persist.rehydrate() после маунта (components/cart/CartHydration.tsx).
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isWidgetOpen: false,
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      incrementQty: (productId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
          ),
        })),
      decrementQty: (productId) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i))
            .filter((i) => i.quantity > 0),
        })),
      clearCart: () => set({ items: [] }),
      openWidget: () => set({ isWidgetOpen: true }),
      closeWidget: () => set({ isWidgetOpen: false }),
    }),
    {
      name: "cart-storage",
      skipHydration: true,
    }
  )
);

// Производные значения — селекторы поверх items, отдельно в сторе не хранятся
// (docs/architecture.md, раздел 4).
export const selectTotalCount = (state: CartState): number =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);

export const selectTotalPrice = (state: CartState): number =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
