import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QtyStepper } from "@/components/catalog/QtyStepper";
import { useCartStore } from "@/stores/cartStore";

const baseProps = {
  productId: 1,
  name: "Эспрессо",
  price: 200,
  imageUrl: "",
  unit: "",
};

beforeEach(() => {
  useCartStore.setState({ items: [], isWidgetOpen: false });
  localStorage.clear();
});

describe("QtyStepper — товар не в корзине (count === 0)", () => {
  it("рендерит кнопку добавления", () => {
    render(<QtyStepper {...baseProps} max={10} />);
    expect(screen.getByRole("button", { name: "Добавить в корзину" })).toBeInTheDocument();
  });

  it("клик добавляет товар в корзину с quantity 1", async () => {
    const user = userEvent.setup();
    render(<QtyStepper {...baseProps} max={10} />);
    await user.click(screen.getByRole("button", { name: "Добавить в корзину" }));
    expect(useCartStore.getState().items).toEqual([{ ...baseProps, quantity: 1 }]);
  });
});

describe("QtyStepper — max <= 0 (нет в наличии)", () => {
  it("рендерит задизейбленную кнопку «Нет в наличии»", () => {
    render(<QtyStepper {...baseProps} max={0} />);
    expect(screen.getByRole("button", { name: "Нет в наличии" })).toBeDisabled();
  });
});

describe("QtyStepper — товар уже в корзине (count > 0)", () => {
  beforeEach(() => {
    useCartStore.getState().addItem(baseProps);
  });

  it("показывает текущее количество", () => {
    render(<QtyStepper {...baseProps} max={10} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("«+» увеличивает quantity", async () => {
    const user = userEvent.setup();
    render(<QtyStepper {...baseProps} max={10} />);
    await user.click(screen.getByRole("button", { name: "Увеличить количество" }));
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("«−» уменьшает quantity", async () => {
    useCartStore.getState().incrementQty(baseProps.productId);
    const user = userEvent.setup();
    render(<QtyStepper {...baseProps} max={10} />);
    await user.click(screen.getByRole("button", { name: "Уменьшить количество" }));
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it("«−» при quantity 1 убирает товар из корзины (без preventRemoveAtOne)", async () => {
    const user = userEvent.setup();
    render(<QtyStepper {...baseProps} max={10} />);
    await user.click(screen.getByRole("button", { name: "Уменьшить количество" }));
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("preventRemoveAtOne=true дизейблит «−» при quantity 1", () => {
    render(<QtyStepper {...baseProps} max={10} preventRemoveAtOne />);
    expect(screen.getByRole("button", { name: "Уменьшить количество" })).toBeDisabled();
  });

  it("«+» дизейблится при достижении max", () => {
    render(<QtyStepper {...baseProps} max={1} />);
    expect(screen.getByRole("button", { name: "Увеличить количество" })).toBeDisabled();
  });
});

describe("QtyStepper — variant cta", () => {
  it("показывает текст «В корзину», когда count === 0", () => {
    render(<QtyStepper {...baseProps} max={10} variant="cta" />);
    expect(screen.getByRole("button", { name: "Добавить в корзину" })).toHaveTextContent("В корзину");
  });

  it("показывает текст «Нет в наличии», когда max <= 0", () => {
    render(<QtyStepper {...baseProps} max={0} variant="cta" />);
    expect(screen.getByRole("button", { name: "Нет в наличии" })).toHaveTextContent("Нет в наличии");
  });
});
