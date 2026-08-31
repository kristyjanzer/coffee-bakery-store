import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const findManyMock = vi.hoisted(() => vi.fn());
const findUniqueMock = vi.hoisted(() => vi.fn());
const createMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
const categoryFindUniqueMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      create: createMock,
      update: updateMock,
      delete: deleteMock,
    },
    category: { findUnique: categoryFindUniqueMock },
  },
}));

beforeEach(() => {
  createMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
  categoryFindUniqueMock.mockReset();
});

describe("getProducts", () => {
  it("запрашивает товары, отсортированные по id, и возвращает результат Prisma как есть", async () => {
    const rows = [{ id: 1, name: "Эспрессо", categoryId: 1 }];
    findManyMock.mockResolvedValueOnce(rows);

    const { getProducts } = await import("@/lib/server/productCatalog");
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

    const { getProductById } = await import("@/lib/server/productCatalog");
    const product = await getProductById(1);

    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } })
    );
    expect(product).toEqual(row);
  });

  it("возвращает null, если Prisma не нашла товар", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const { getProductById } = await import("@/lib/server/productCatalog");
    expect(await getProductById(999999)).toBeNull();
  });
});

describe("createProduct", () => {
  it("резолвит categorySlug в categoryId перед созданием товара", async () => {
    categoryFindUniqueMock.mockResolvedValueOnce({ id: 5, slug: "kofe" });
    createMock.mockResolvedValueOnce({ id: 1, name: "Эспрессо", categoryId: 5 });

    const { createProduct } = await import("@/lib/server/productCatalog");
    const result = await createProduct({ name: "Эспрессо", categorySlug: "kofe", price: 200 });

    expect(result).toEqual({ ok: true, product: { id: 1, name: "Эспрессо", categoryId: 5 } });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ categoryId: 5, name: "Эспрессо", price: 200 }) })
    );
  });

  it("возвращает ok:false, если категория не найдена, и не создаёт товар", async () => {
    categoryFindUniqueMock.mockResolvedValueOnce(null);

    const { createProduct } = await import("@/lib/server/productCatalog");
    const result = await createProduct({ name: "Эспрессо", categorySlug: "no-such", price: 200 });

    expect(result.ok).toBe(false);
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("updateProduct", () => {
  it("возвращает ok:false, если товар не найден, и не вызывает update", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const { updateProduct } = await import("@/lib/server/productCatalog");
    const result = await updateProduct(999999, { name: "Новое имя" });

    expect(result).toEqual({ ok: false, error: "Товар не найден" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("обновляет только присланные поля, не трогая categoryId без categorySlug", async () => {
    findUniqueMock.mockResolvedValueOnce({ id: 1 });
    updateMock.mockResolvedValueOnce({ id: 1, name: "Новое имя" });

    const { updateProduct } = await import("@/lib/server/productCatalog");
    await updateProduct(1, { name: "Новое имя" });

    expect(categoryFindUniqueMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Новое имя", categoryId: undefined }) })
    );
  });

  it("возвращает ok:false, если новая категория не найдена", async () => {
    findUniqueMock.mockResolvedValueOnce({ id: 1 });
    categoryFindUniqueMock.mockResolvedValueOnce(null);

    const { updateProduct } = await import("@/lib/server/productCatalog");
    const result = await updateProduct(1, { categorySlug: "no-such" });

    expect(result.ok).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("deleteProduct", () => {
  it("возвращает ok:false, если товар не найден, и не вызывает delete", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const { deleteProduct } = await import("@/lib/server/productCatalog");
    const result = await deleteProduct(999999);

    expect(result).toEqual({ ok: false, error: "Товар не найден" });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("удаляет товар и возвращает ok:true", async () => {
    findUniqueMock.mockResolvedValueOnce({ id: 1 });
    deleteMock.mockResolvedValueOnce({ id: 1 });

    const { deleteProduct } = await import("@/lib/server/productCatalog");
    expect(await deleteProduct(1)).toEqual({ ok: true });
  });

  it("возвращает понятную ошибку при нарушении внешнего ключа (P2003)", async () => {
    findUniqueMock.mockResolvedValueOnce({ id: 1 });
    deleteMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("FK violation", {
        code: "P2003",
        clientVersion: "test",
      })
    );

    const { deleteProduct } = await import("@/lib/server/productCatalog");
    const result = await deleteProduct(1);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("заказы или отзывы");
    }
  });
});
