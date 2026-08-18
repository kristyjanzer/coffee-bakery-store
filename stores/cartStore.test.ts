import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore, selectTotalCount, selectTotalPrice, type CartItem } from "@/stores/cartStore";

const espresso: Omit<CartItem, "quantity"> = {
  productId: 1,
  name: "Эспрессо",
  price: 200,
  imageUrl: "",
  unit: "",
};

const croissant: Omit<CartItem, "quantity"> = {
  productId: 2,
  name: "Круассан",
  price: 150,
  imageUrl: "",
  unit: "60 г",
};

beforeEach(() => {
  useCartStore.setState({ items: [], isWidgetOpen: false });
  localStorage.clear();
});

describe("cartStore addItem", () => {
  it("добавляет новый товар с quantity 1", () => {
    useCartStore.getState().addItem(espresso);
    expect(useCartStore.getState().items).toEqual([{ ...espresso, quantity: 1 }]);
  });

  it("увеличивает quantity, если товар уже в корзине", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(espresso);
    expect(useCartStore.getState().items).toEqual([{ ...espresso, quantity: 2 }]);
  });

  it("не путает разные товары друг с другом", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(croissant);
    expect(useCartStore.getState().items).toHaveLength(2);
  });
});

describe("cartStore removeItem", () => {
  it("удаляет товар по productId", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(croissant);
    useCartStore.getState().removeItem(espresso.productId);
    expect(useCartStore.getState().items).toEqual([{ ...croissant, quantity: 1 }]);
  });

  it("не падает, если товара с таким id нет", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().removeItem(999);
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});

describe("cartStore incrementQty / decrementQty", () => {
  it("incrementQty увеличивает quantity на 1", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().incrementQty(espresso.productId);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("decrementQty уменьшает quantity на 1", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().incrementQty(espresso.productId);
    useCartStore.getState().decrementQty(espresso.productId);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it("decrementQty убирает товар из items, когда quantity доходит до 0", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().decrementQty(espresso.productId);
    expect(useCartStore.getState().items).toEqual([]);
  });
});

describe("cartStore clearCart / openWidget / closeWidget", () => {
  it("clearCart опустошает items", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(croissant);
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("openWidget/closeWidget переключают isWidgetOpen", () => {
    useCartStore.getState().openWidget();
    expect(useCartStore.getState().isWidgetOpen).toBe(true);
    useCartStore.getState().closeWidget();
    expect(useCartStore.getState().isWidgetOpen).toBe(false);
  });
});

describe("selectTotalCount / selectTotalPrice", () => {
  it("selectTotalCount суммирует quantity всех товаров", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(croissant);
    expect(selectTotalCount(useCartStore.getState())).toBe(3);
  });

  it("selectTotalPrice суммирует price * quantity по всем товарам", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(croissant);
    expect(selectTotalPrice(useCartStore.getState())).toBe(200 * 2 + 150 * 1);
  });

  it("для пустой корзины возвращают 0", () => {
    expect(selectTotalCount(useCartStore.getState())).toBe(0);
    expect(selectTotalPrice(useCartStore.getState())).toBe(0);
  });
});

describe("cartStore persist", () => {
  it("после addItem состояние сохраняется в localStorage под ключом cart-storage", () => {
    useCartStore.getState().addItem(espresso);
    const raw = localStorage.getItem("cart-storage");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.items).toEqual([{ ...espresso, quantity: 1 }]);
  });
});
