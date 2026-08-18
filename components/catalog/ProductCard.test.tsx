import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "@/components/catalog/ProductCard";
import { useCartStore } from "@/stores/cartStore";
import type { MenuProduct } from "@/lib/menu";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const baseProduct: MenuProduct = {
  id: 1,
  name: "Капучино",
  price: 270,
  currency: "RUB",
  stockQuantity: 10,
  imageUrl: "",
  volumeMl: 400,
};

beforeEach(() => {
  useCartStore.setState({ items: [], isWidgetOpen: false });
  localStorage.clear();
});

describe("ProductCard", () => {
  it("рендерит название и отформатированную цену", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("Капучино")).toBeInTheDocument();
    expect(screen.getByText("270 ₽")).toBeInTheDocument();
  });

  it("показывает подпись объёма, когда указан volumeMl", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("400 мл")).toBeInTheDocument();
  });

  it("показывает подпись веса, когда указан weightG (и нет volumeMl)", () => {
    render(<ProductCard product={{ ...baseProduct, volumeMl: undefined, weightG: 220 }} />);
    expect(screen.getByText("220 г")).toBeInTheDocument();
  });

  it("не показывает подпись, если нет ни volumeMl, ни weightG", () => {
    render(<ProductCard product={{ ...baseProduct, volumeMl: undefined, weightG: undefined }} />);
    expect(screen.queryByText(/^\d+\s(мл|г)$/)).not.toBeInTheDocument();
  });

  it("обе ссылки карточки ведут на /product/:id", () => {
    render(<ProductCard product={baseProduct} />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(1);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/product/1"));
  });

  it("показывает плашку-заглушку, если imageUrl пустой", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("показывает изображение, если imageUrl задан", () => {
    render(<ProductCard product={{ ...baseProduct, imageUrl: "https://res.cloudinary.com/x.jpg" }} />);
    expect(screen.getByRole("img", { name: "Капучино" })).toBeInTheDocument();
  });

  it("клик по кнопке добавления кладёт товар в cartStore", async () => {
    const user = userEvent.setup();
    render(<ProductCard product={baseProduct} />);
    await user.click(screen.getByRole("button", { name: "Добавить в корзину" }));
    expect(useCartStore.getState().items).toEqual([
      { productId: 1, name: "Капучино", price: 270, imageUrl: "", quantity: 1, unit: "400 мл" },
    ]);
  });
});
