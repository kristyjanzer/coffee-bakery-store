import { describe, expect, it } from "vitest";
import { getCatalog, getProductById } from "@/lib/menu";

describe("getCatalog", () => {
  it("возвращает непустой список категорий", () => {
    expect(getCatalog().length).toBeGreaterThan(0);
  });

  it("у каждой категории есть slug, name и непустой список products", () => {
    for (const category of getCatalog()) {
      expect(category.slug).toBeTruthy();
      expect(category.name).toBeTruthy();
      expect(category.products.length).toBeGreaterThan(0);
    }
  });

  it("маппит snake_case поля menu.json в camelCase MenuProduct", () => {
    const product = getCatalog()[0].products[0];
    expect(product).toHaveProperty("stockQuantity");
    expect(product).toHaveProperty("imageUrl");
    expect(product).not.toHaveProperty("stock_quantity");
  });
});

describe("getProductById", () => {
  it("находит товар по существующему id", () => {
    const anyProduct = getCatalog()[0].products[0];
    const found = getProductById(anyProduct.id);
    expect(found?.id).toBe(anyProduct.id);
    expect(found?.name).toBe(anyProduct.name);
  });

  it("возвращает undefined для несуществующего id", () => {
    expect(getProductById(-1)).toBeUndefined();
  });
});
