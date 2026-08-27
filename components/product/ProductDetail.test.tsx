import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductDetail } from "@/components/product/ProductDetail";
import type { MenuProduct } from "@/lib/menu";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- заглушка next/image для теста
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("@/components/catalog/QtyStepper", () => ({
  QtyStepper: () => <div data-testid="qty-stepper" />,
}));

const baseProduct: MenuProduct = {
  id: 1,
  name: "Двойной эспрессо",
  price: 200,
  currency: "RUB",
  stockQuantity: null,
  imageUrl: "",
  volumeMl: 50,
  calories: 18,
  composition: "кофейное зерно (100% Арабика), вода",
  protein: 1.5,
  fat: 0.3,
  carbs: 2.2,
};

describe("ProductDetail", () => {
  it("показывает состав и КБЖУ, когда данные есть", () => {
    render(<ProductDetail product={baseProduct} />);

    expect(screen.getByText("Состав")).toBeInTheDocument();
    expect(
      screen.getByText("кофейное зерно (100% Арабика), вода")
    ).toBeInTheDocument();

    expect(screen.getByText("Белки")).toBeInTheDocument();
    expect(screen.getByText("1.5 г")).toBeInTheDocument();
    expect(screen.getByText("Жиры")).toBeInTheDocument();
    expect(screen.getByText("0.3 г")).toBeInTheDocument();
    expect(screen.getByText("Углеводы")).toBeInTheDocument();
    expect(screen.getByText("2.2 г")).toBeInTheDocument();
    expect(screen.getByText("Ккал")).toBeInTheDocument();
  });

  it("не рендерит блок состава и пустые поля КБЖУ, если их нет", () => {
    render(
      <ProductDetail
        product={{ ...baseProduct, composition: undefined, protein: undefined, fat: undefined, carbs: undefined }}
      />
    );

    expect(screen.queryByText("Состав")).not.toBeInTheDocument();
    expect(screen.queryByText("Белки")).not.toBeInTheDocument();
    // Калорийность осталась — она задана.
    expect(screen.getByText("Ккал")).toBeInTheDocument();
  });
});
