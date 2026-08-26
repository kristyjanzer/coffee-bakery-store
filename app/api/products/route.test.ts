import { describe, expect, it, vi } from "vitest";

const getProductsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/productCatalog", () => ({
  getProducts: getProductsMock,
}));

describe("GET /api/products", () => {
  it("возвращает 200 и список товаров из lib/productCatalog", async () => {
    const products = [{ id: 1, name: "Эспрессо" }];
    getProductsMock.mockResolvedValueOnce(products);

    const { GET } = await import("@/app/api/products/route");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(products);
  });

  it("возвращает 500, если запрос к БД падает", async () => {
    getProductsMock.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { GET } = await import("@/app/api/products/route");
    const response = await GET();

    expect(response.status).toBe(500);
  });
});
