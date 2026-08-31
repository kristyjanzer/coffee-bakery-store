import { describe, expect, it, vi } from "vitest";

const getCategoriesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/categories", () => ({
  getCategories: getCategoriesMock,
}));

describe("GET /api/categories", () => {
  it("возвращает 200 и список категорий из lib/categories", async () => {
    const categories = [{ id: 1, name: "Кофе", slug: "kofe", sortOrder: 0 }];
    getCategoriesMock.mockResolvedValueOnce(categories);

    const { GET } = await import("@/app/api/categories/route");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(categories);
  });

  it("возвращает 500, если запрос к БД падает", async () => {
    getCategoriesMock.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { GET } = await import("@/app/api/categories/route");
    const response = await GET();

    expect(response.status).toBe(500);
  });
});
