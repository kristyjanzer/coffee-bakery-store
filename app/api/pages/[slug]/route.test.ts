import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const sitePageUpdateMock = vi.hoisted(() => vi.fn());
const requireAdminSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { sitePage: { update: sitePageUpdateMock } },
}));

vi.mock("@/lib/auth", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function patchRequest(slug: string, body: unknown) {
  return new Request(`http://localhost/api/pages/${slug}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

const validBody = {
  title: "О нас",
  content: "Текст страницы",
  seoTitle: "О нас — Coffee Bakery",
  seoDescription: "Описание",
};

beforeEach(() => {
  sitePageUpdateMock.mockReset();
  requireAdminSessionMock.mockReset();
});

describe("PATCH /api/pages/[slug]", () => {
  it("возвращает 401 без сессии, не трогая БД", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });

    const { PATCH } = await import("@/app/api/pages/[slug]/route");
    const response = await PATCH(patchRequest("about", validBody), makeParams("about"));

    expect(response.status).toBe(401);
    expect(sitePageUpdateMock).not.toHaveBeenCalled();
  });

  it("возвращает 403 для роли без прав", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 403 });

    const { PATCH } = await import("@/app/api/pages/[slug]/route");
    const response = await PATCH(patchRequest("about", validBody), makeParams("about"));

    expect(response.status).toBe(403);
    expect(sitePageUpdateMock).not.toHaveBeenCalled();
  });

  it("возвращает 400 для неизвестного slug", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { PATCH } = await import("@/app/api/pages/[slug]/route");
    const response = await PATCH(patchRequest("bogus", validBody), makeParams("bogus"));

    expect(response.status).toBe(400);
    expect(sitePageUpdateMock).not.toHaveBeenCalled();
  });

  it("возвращает 400 при невалидном теле", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { PATCH } = await import("@/app/api/pages/[slug]/route");
    const response = await PATCH(patchRequest("about", { ...validBody, title: "" }), makeParams("about"));

    expect(response.status).toBe(400);
    expect(sitePageUpdateMock).not.toHaveBeenCalled();
  });

  it("возвращает 200 и обновляет страницу по slug для ADMIN", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    sitePageUpdateMock.mockResolvedValueOnce({ slug: "about", ...validBody });

    const { PATCH } = await import("@/app/api/pages/[slug]/route");
    const response = await PATCH(patchRequest("about", validBody), makeParams("about"));

    expect(response.status).toBe(200);
    expect(sitePageUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "about" } })
    );
  });

  it("возвращает 404, если страницы с таким slug нет в БД (P2025)", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    sitePageUpdateMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Record to update not found", {
        code: "P2025",
        clientVersion: "x",
      })
    );

    const { PATCH } = await import("@/app/api/pages/[slug]/route");
    const response = await PATCH(patchRequest("about", validBody), makeParams("about"));

    expect(response.status).toBe(404);
  });

  it("возвращает 500, если запрос к БД падает", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    sitePageUpdateMock.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { PATCH } = await import("@/app/api/pages/[slug]/route");
    const response = await PATCH(patchRequest("about", validBody), makeParams("about"));

    expect(response.status).toBe(500);
  });
});
