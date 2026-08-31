import { beforeEach, describe, expect, it, vi } from "vitest";

const updateAdminUserRoleMock = vi.hoisted(() => vi.fn());
const deleteAdminUserMock = vi.hoisted(() => vi.fn());
const requireAdminSessionMock = vi.hoisted(() => vi.fn());
const getServerSessionMock = vi.hoisted(() => vi.fn());
const adminFindUniqueMock = vi.hoisted(() => vi.fn());

class LastAdminError extends Error {
  constructor() {
    super("Нельзя удалить или разжаловать последнего администратора");
    this.name = "LastAdminError";
  }
}

vi.mock("@/lib/server/settings", () => ({
  updateAdminUserRole: updateAdminUserRoleMock,
  deleteAdminUser: deleteAdminUserMock,
  LastAdminError,
}));

vi.mock("@/lib/auth/auth", () => ({
  requireAdminSession: requireAdminSessionMock,
  authOptions: {},
}));

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { adminUser: { findUnique: adminFindUniqueMock } },
}));

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/admin-users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  updateAdminUserRoleMock.mockReset();
  deleteAdminUserMock.mockReset();
  requireAdminSessionMock.mockReset();
  getServerSessionMock.mockReset();
  adminFindUniqueMock.mockReset();
  // По умолчанию — сессия другого админа, guardSelf не срабатывает.
  getServerSessionMock.mockResolvedValue({ user: { email: "admin@example.com" } });
  adminFindUniqueMock.mockResolvedValue({ email: "other@example.com" });
});

describe("PATCH /api/admin-users/[id]", () => {
  it("возвращает 401 без сессии", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const { PATCH } = await import("@/app/api/admin-users/[id]/route");
    const response = await PATCH(patchRequest("1", { role: "ADMIN" }), makeParams("1"));
    expect(response.status).toBe(401);
    expect(updateAdminUserRoleMock).not.toHaveBeenCalled();
  });

  it("возвращает 403 для ORDER_MANAGER", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 403 });
    const { PATCH } = await import("@/app/api/admin-users/[id]/route");
    expect((await PATCH(patchRequest("1", { role: "ADMIN" }), makeParams("1"))).status).toBe(403);
  });

  it("возвращает 400 при невалидной роли", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    const { PATCH } = await import("@/app/api/admin-users/[id]/route");
    const response = await PATCH(patchRequest("1", { role: "GUEST" }), makeParams("1"));
    expect(response.status).toBe(400);
    expect(updateAdminUserRoleMock).not.toHaveBeenCalled();
  });

  it("возвращает 200 и обновлённого пользователя при успехе", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    const updated = { id: 2, email: "other@example.com", role: "ADMIN" };
    updateAdminUserRoleMock.mockResolvedValueOnce(updated);
    const { PATCH } = await import("@/app/api/admin-users/[id]/route");
    const response = await PATCH(patchRequest("2", { role: "ADMIN" }), makeParams("2"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(updated);
  });

  it("возвращает 409, если updateAdminUserRole бросает LastAdminError", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    updateAdminUserRoleMock.mockRejectedValueOnce(new LastAdminError());
    const { PATCH } = await import("@/app/api/admin-users/[id]/route");
    expect((await PATCH(patchRequest("2", { role: "ORDER_MANAGER" }), makeParams("2"))).status).toBe(409);
  });

  it("возвращает 409 при попытке снять роль ADMIN с самого себя", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    adminFindUniqueMock.mockResolvedValue({ email: "admin@example.com" });
    const { PATCH } = await import("@/app/api/admin-users/[id]/route");
    const response = await PATCH(patchRequest("1", { role: "ORDER_MANAGER" }), makeParams("1"));
    expect(response.status).toBe(409);
    expect(updateAdminUserRoleMock).not.toHaveBeenCalled();
  });

  it("возвращает 404, если пользователь не найден (Prisma P2025)", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    updateAdminUserRoleMock.mockRejectedValueOnce({ code: "P2025" });
    const { PATCH } = await import("@/app/api/admin-users/[id]/route");
    expect((await PATCH(patchRequest("999", { role: "ADMIN" }), makeParams("999"))).status).toBe(404);
  });
});

describe("DELETE /api/admin-users/[id]", () => {
  it("возвращает 401 без сессии", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const { DELETE } = await import("@/app/api/admin-users/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/admin-users/1"), makeParams("1"));
    expect(response.status).toBe(401);
    expect(deleteAdminUserMock).not.toHaveBeenCalled();
  });

  it("возвращает 204 при успешном удалении", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    deleteAdminUserMock.mockResolvedValueOnce(undefined);
    const { DELETE } = await import("@/app/api/admin-users/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/admin-users/2"), makeParams("2"));
    expect(response.status).toBe(204);
  });

  it("возвращает 409 при удалении самого себя", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    adminFindUniqueMock.mockResolvedValue({ email: "admin@example.com" });
    const { DELETE } = await import("@/app/api/admin-users/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/admin-users/1"), makeParams("1"));
    expect(response.status).toBe(409);
    expect(deleteAdminUserMock).not.toHaveBeenCalled();
  });

  it("возвращает 409, если deleteAdminUser бросает LastAdminError", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    deleteAdminUserMock.mockRejectedValueOnce(new LastAdminError());
    const { DELETE } = await import("@/app/api/admin-users/[id]/route");
    expect(
      (await DELETE(new Request("http://localhost/api/admin-users/2"), makeParams("2"))).status
    ).toBe(409);
  });

  it("возвращает 404, если пользователь не найден (Prisma P2025)", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    deleteAdminUserMock.mockRejectedValueOnce({ code: "P2025" });
    const { DELETE } = await import("@/app/api/admin-users/[id]/route");
    expect(
      (await DELETE(new Request("http://localhost/api/admin-users/999"), makeParams("999"))).status
    ).toBe(404);
  });

  it("возвращает 400 при нечисловом id", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    const { DELETE } = await import("@/app/api/admin-users/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/admin-users/abc"), makeParams("abc"));
    expect(response.status).toBe(400);
    expect(deleteAdminUserMock).not.toHaveBeenCalled();
  });
});
