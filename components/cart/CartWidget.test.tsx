import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartWidget } from "@/components/cart/CartWidget";
import { useCartStore } from "@/stores/cartStore";
import type { MenuProduct } from "@/lib/shared/menu";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- заглушка next/image только для теста
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("@/lib/shared/menu", () => ({
  getProductById: (id: number): MenuProduct | undefined => {
    const products: Record<number, MenuProduct> = {
      1: { id: 1, name: "Эспрессо", price: 200, currency: "RUB", stockQuantity: 10, imageUrl: "" },
      2: { id: 2, name: "Круассан", price: 150, currency: "RUB", stockQuantity: 5, imageUrl: "" },
    };
    return products[id];
  },
}));

beforeEach(() => {
  useCartStore.setState({ items: [], isWidgetOpen: true });
  localStorage.clear();
});

describe("CartWidget — пустая корзина", () => {
  it("показывает «Корзина пуста»", () => {
    render(<CartWidget />);
    expect(screen.getByText("Корзина пуста")).toBeInTheDocument();
  });
});

describe("CartWidget — корзина с товарами", () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [
        { productId: 1, name: "Эспрессо", price: 200, imageUrl: "", quantity: 1, unit: "" },
        { productId: 2, name: "Круассан", price: 150, imageUrl: "", quantity: 1, unit: "60 г" },
      ],
      isWidgetOpen: true,
    });
  });

  it("рендерит товары и итоговую сумму", () => {
    render(<CartWidget />);
    expect(screen.getByText("Эспрессо")).toBeInTheDocument();
    expect(screen.getByText("Круассан")).toBeInTheDocument();
    expect(screen.getByText("Итого")).toBeInTheDocument();
    expect(screen.getByText("350 ₽")).toBeInTheDocument();
  });

  it("клик по кнопке удаления убирает конкретный товар из корзины", async () => {
    const user = userEvent.setup();
    render(<CartWidget />);
    await user.click(screen.getByRole("button", { name: "Убрать «Эспрессо» из корзины" }));
    expect(useCartStore.getState().items).toEqual([
      { productId: 2, name: "Круассан", price: 150, imageUrl: "", quantity: 1, unit: "60 г" },
    ]);
  });

  it("клик «Оформить заказ» переключает виджет на шаг checkout", async () => {
    const user = userEvent.setup();
    render(<CartWidget />);
    await user.click(screen.getByRole("button", { name: "Оформить заказ" }));
    expect(screen.getByRole("dialog", { name: "Оформление заказа" })).toBeInTheDocument();
  });
});
