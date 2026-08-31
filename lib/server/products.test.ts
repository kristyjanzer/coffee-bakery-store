import { describe, expect, it, vi, beforeEach } from "vitest";

const productFindManyMock = vi.hoisted(() => vi.fn());
const productFindUniqueMock = vi.hoisted(() => vi.fn());
const categoryFindManyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findMany: productFindManyMock, findUnique: productFindUniqueMock },
    category: { findMany: categoryFindManyMock },
  },
}));

beforeEach(() => {
  productFindManyMock.mockReset();
  productFindUniqueMock.mockReset();
  categoryFindManyMock.mockReset();
});

const row = {
  id: 1,
  name: "Капучино",
  price: 270,
  currency: "RUB",
  stockQuantity: null,
  imageUrl: null,
  volumeMl: 250,
  weightG: null,
  calories: null,
  description: null,
  composition: null,
  allergens: null,
  protein: null,
  fat: null,
  carbs: null,
  expiryInfo: null,
  isSeasonal: false,
  isActive: true,
  category: { name: "Кофе", slug: "kofe" },
};

describe("getAdminProducts", () => {
  it("без фильтров запрашивает все товары по id и разворачивает категорию + null-поля", async () => {
    productFindManyMock.mockResolvedValueOnce([row]);

    const { getAdminProducts } = await import("@/lib/server/products");
    const products = await getAdminProducts();

    expect(productFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, orderBy: { id: "asc" } })
    );
    expect(products[0]).toMatchObject({
      id: 1,
      categorySlug: "kofe",
      categoryName: "Кофе",
      imageUrl: "",
      description: "",
      protein: null,
      volumeMl: 250,
      weightG: undefined,
    });
  });

  it("фильтр по категории и сезонности превращается в where", async () => {
    productFindManyMock.mockResolvedValueOnce([]);

    const { getAdminProducts } = await import("@/lib/server/products");
    await getAdminProducts({ categorySlug: "kofe", seasonalOnly: true });

    expect(productFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { category: { slug: "kofe" }, isSeasonal: true },
      })
    );
  });
});

describe("getAdminProductById", () => {
  it("возвращает undefined, если товар не найден", async () => {
    productFindUniqueMock.mockResolvedValueOnce(null);

    const { getAdminProductById } = await import("@/lib/server/products");
    expect(await getAdminProductById(999999)).toBeUndefined();
  });
});

describe("getAdminCategories", () => {
  it("запрашивает категории по sortOrder", async () => {
    categoryFindManyMock.mockResolvedValueOnce([{ name: "Кофе", slug: "kofe" }]);

    const { getAdminCategories } = await import("@/lib/server/products");
    const categories = await getAdminCategories();

    expect(categoryFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { sortOrder: "asc" } })
    );
    expect(categories).toEqual([{ name: "Кофе", slug: "kofe" }]);
  });
});
