import { describe, expect, it, vi, beforeEach } from "vitest";

const categoryFindManyMock = vi.hoisted(() => vi.fn());
const productFindFirstMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: { findMany: categoryFindManyMock },
    product: { findFirst: productFindFirstMock },
  },
}));

beforeEach(() => {
  categoryFindManyMock.mockReset();
  productFindFirstMock.mockReset();
});

describe("getCatalog", () => {
  it("запрашивает категории по sortOrder и только активные товары внутри", async () => {
    categoryFindManyMock.mockResolvedValueOnce([]);

    const { getCatalog } = await import("@/lib/server/catalog");
    await getCatalog();

    expect(categoryFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { sortOrder: "asc" },
        select: expect.objectContaining({
          products: expect.objectContaining({ where: { isActive: true } }),
        }),
      })
    );
  });

  it("разворачивает категории в форму MenuCategory, приводя null-поля товара к undefined/\"\"", async () => {
    categoryFindManyMock.mockResolvedValueOnce([
      {
        name: "Кофе",
        slug: "kofe",
        products: [
          {
            id: 1,
            name: "Эспрессо",
            price: 200,
            currency: "RUB",
            stockQuantity: null,
            imageUrl: null,
            volumeMl: 50,
            weightG: null,
            calories: null,
            description: null,
            composition: null,
            protein: null,
            fat: null,
            carbs: null,
          },
        ],
      },
    ]);

    const { getCatalog } = await import("@/lib/server/catalog");
    const catalog = await getCatalog();

    expect(catalog).toEqual([
      {
        slug: "kofe",
        name: "Кофе",
        products: [
          {
            id: 1,
            name: "Эспрессо",
            price: 200,
            currency: "RUB",
            stockQuantity: null,
            imageUrl: "",
            volumeMl: 50,
            weightG: undefined,
            calories: undefined,
            description: undefined,
            composition: undefined,
            protein: undefined,
            fat: undefined,
            carbs: undefined,
          },
        ],
      },
    ]);
  });
});

describe("getProductForDetail", () => {
  it("ищет активный товар по id и возвращает его в форме MenuProduct", async () => {
    productFindFirstMock.mockResolvedValueOnce({
      id: 7,
      name: "Латте",
      price: 270,
      currency: "RUB",
      stockQuantity: null,
      imageUrl: "https://img/latte.avif",
      volumeMl: 300,
      weightG: null,
      calories: 120,
      description: "мягкий",
      composition: null,
      protein: 3.2,
      fat: null,
      carbs: null,
    });

    const { getProductForDetail } = await import("@/lib/server/catalog");
    const product = await getProductForDetail(7);

    expect(productFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7, isActive: true } })
    );
    expect(product).toMatchObject({ id: 7, name: "Латте", imageUrl: "https://img/latte.avif", carbs: undefined });
  });

  it("возвращает null, если активного товара с таким id нет", async () => {
    productFindFirstMock.mockResolvedValueOnce(null);

    const { getProductForDetail } = await import("@/lib/server/catalog");
    expect(await getProductForDetail(999999)).toBeNull();
  });
});
