import { describe, expect, it, vi } from "vitest";

const findManyMock = vi.hoisted(() => vi.fn());
const findUniqueMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { product: { findMany: findManyMock, findUnique: findUniqueMock } },
}));

describe("getProducts", () => {
  it("запрашивает товары, отсортированные по id, и возвращает результат Prisma как есть", async () => {
    const rows = [{ id: 1, name: "Эспрессо", categoryId: 1 }];
    findManyMock.mockResolvedValueOnce(rows);

    const { getProducts } = await import("@/lib/productCatalog");
    const products = await getProducts();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { id: "asc" } })
    );
    expect(products).toEqual(rows);
  });
});

describe("getProductById", () => {
  it("запрашивает товар по id и возвращает результат Prisma", async () => {
    const row = { id: 1, name: "Эспрессо", categoryId: 1 };
    findUniqueMock.mockResolvedValueOnce(row);

    const { getProductById } = await import("@/lib/productCatalog");
    const product = await getProductById(1);

    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } })
    );
    expect(product).toEqual(row);
  });

  it("возвращает null, если Prisma не нашла товар", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const { getProductById } = await import("@/lib/productCatalog");
    expect(await getProductById(999999)).toBeNull();
  });
});
