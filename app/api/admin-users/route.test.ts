import { describe, expect, it, vi, beforeEach } from "vitest";

const getAdminUsersMock = vi.hoisted(() => vi.fn());
const createAdminUserMock = vi.hoisted(() => vi.fn());
const requireAdminSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/settings", () => ({
  getAdminUsers: getAdminUsersMock,
  createAdminUser: createAdminUserMock,
}));

vi.mock("@/lib/auth", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

beforeEach(() => {
  getAdminUsersMock.mockReset();
  createAdminUserMock.mockReset();
  requireAdminSessionMock.mockReset();
});

const validBody = { email: "manager@example.com", password: "supersecret", role: "ORDER_MANAGER" };

function postRequest(body: unknown) {
  return new Request("http://localhost/api/admin-users", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin-users", () => {
  it("возвращает 401 без сессии", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const { GET } = await import("@/app/api/admin-users/route");
    expect((await GET()).status).toBe(401);
  });

  it("возвращает 403 для ORDER_MANAGER", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 403 });
    const { GET } = await import("@/app/api/admin-users/route");
    expect((await GET()).status).toBe(403);
  });

  it("возвращает 200 и список для ADMIN", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    const users = [{ id: 1, email: "a@example.com", role: "ADMIN" }];
    getAdminUsersMock.mockResolvedValueOnce(users);

    const { GET } = await import("@/app/api/admin-users/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(users);
  });
});

describe("POST /api/admin-users", () => {
  it("возвращает 401 без сессии, не вызывая createAdminUser", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const { POST } = await import("@/app/api/admin-users/route");
    const response = await POST(postRequest(validBody));
    expect(response.status).toBe(401);
    expect(createAdminUserMock).not.toHaveBeenCalled();
  });

  it("возвращает 403 для ORDER_MANAGER", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 403 });
    const { POST } = await import("@/app/api/admin-users/route");
    expect((await POST(postRequest(validBody))).status).toBe(403);
  });

  it("возвращает 400 при пароле короче 8 символов", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    const { POST } = await import("@/app/api/admin-users/route");
    const response = await POST(postRequest({ ...validBody, password: "short" }));
    expect(response.status).toBe(400);
    expect(createAdminUserMock).not.toHaveBeenCalled();
  });

  it("возвращает 409, если email уже занят (Prisma P2002)", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    createAdminUserMock.mockRejectedValueOnce({ code: "P2002" });
    const { POST } = await import("@/app/api/admin-users/route");
    expect((await POST(postRequest(validBody))).status).toBe(409);
  });

  it("возвращает 201 и созданного пользователя", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    const created = { id: 5, email: "manager@example.com", role: "ORDER_MANAGER" };
    createAdminUserMock.mockResolvedValueOnce(created);
    const { POST } = await import("@/app/api/admin-users/route");
    const response = await POST(postRequest(validBody));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(created);
  });
});
