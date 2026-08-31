import { describe, expect, it, vi } from "vitest";

const findManyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { category: { findMany: findManyMock } },
}));

describe("getCategories", () => {
  it("запрашивает категории с сортировкой по sortOrder и возвращает результат Prisma как есть", async () => {
    const rows = [
      { id: 1, name: "Кофе", slug: "kofe", sortOrder: 0 },
      { id: 2, name: "Выпечка", slug: "vypechka", sortOrder: 1 },
    ];
    findManyMock.mockResolvedValueOnce(rows);

    const { getCategories } = await import("@/lib/server/categories");
    const categories = await getCategories();

    expect(findManyMock).toHaveBeenCalledWith({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, sortOrder: true },
    });
    expect(categories).toEqual(rows);
  });
});
