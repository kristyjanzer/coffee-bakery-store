import { describe, expect, it, vi, beforeEach } from "vitest";

const pageFindMany = vi.hoisted(() => vi.fn());
const pageFindUnique = vi.hoisted(() => vi.fn());
const bannerFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sitePage: { findMany: pageFindMany, findUnique: pageFindUnique },
    banner: { findMany: bannerFindMany },
  },
}));

beforeEach(() => {
  pageFindMany.mockReset(); pageFindUnique.mockReset(); bannerFindMany.mockReset();
});

describe("getSitePageBySlug", () => {
  it("возвращает страницу по slug", async () => {
    pageFindUnique.mockResolvedValueOnce({ slug: "about", title: "О нас" });
    const { getSitePageBySlug } = await import("@/lib/server/pages");
    expect(await getSitePageBySlug("about")).toMatchObject({ slug: "about" });
  });
});

describe("getBanners", () => {
  it("сортирует по sortOrder", async () => {
    bannerFindMany.mockResolvedValueOnce([]);
    const { getBanners } = await import("@/lib/server/pages");
    await getBanners();
    expect(bannerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { sortOrder: "asc" } })
    );
  });
});
