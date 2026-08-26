import { describe, expect, it, vi, beforeEach } from "vitest";

const getOrderByIdMock = vi.hoisted(() => vi.fn());
const updateOrderStatusMock = vi.hoisted(() => vi.fn());
const requireAdminSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/orderAdmin", () => ({
  getOrderById: getOrderByIdMock,
  updateOrderStatus: updateOrderStatusMock,
}));

vi.mock("@/lib/auth", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

beforeEach(() => {
  getOrderByIdMock.mockReset();
  updateOrderStatusMock.mockReset();
  requireAdminSessionMock.mockReset();
});

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("GET /api/orders/[id]", () => {
  it("возвращает 401 без сессии", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });

    const { GET } = await import("@/app/api/orders/[id]/route");
    const response = await GET(new Request("http://localhost/api/orders/1"), makeParams("1"));

    expect(response.status).toBe(401);
    expect(getOrderByIdMock).not.toHaveBeenCalled();
  });

  it("пропускает ORDER_MANAGER", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ORDER_MANAGER" });
    const order = { id: 1, status: "NEW" };
    getOrderByIdMock.mockResolvedValueOnce(order);

    const { GET } = await import("@/app/api/orders/[id]/route");
    const response = await GET(new Request("http://localhost/api/orders/1"), makeParams("1"));

    expect(requireAdminSessionMock).toHaveBeenCalledWith(["ADMIN", "ORDER_MANAGER"]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(order);
  });

  it("возвращает 400 при нечисловом id", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { GET } = await import("@/app/api/orders/[id]/route");
    const response = await GET(new Request("http://localhost/api/orders/abc"), makeParams("abc"));

    expect(response.status).toBe(400);
    expect(getOrderByIdMock).not.toHaveBeenCalled();
  });

  it("возвращает 404, если заказ не найден", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    getOrderByIdMock.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/orders/[id]/route");
    const response = await GET(new Request("http://localhost/api/orders/999999"), makeParams("999999"));

    expect(response.status).toBe(404);
  });

  it("возвращает 500, если запрос к БД падает", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    getOrderByIdMock.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { GET } = await import("@/app/api/orders/[id]/route");
    const response = await GET(new Request("http://localhost/api/orders/1"), makeParams("1"));

    expect(response.status).toBe(500);
  });
});

describe("PATCH /api/orders/[id]", () => {
  it("возвращает 401 без сессии, не вызывая updateOrderStatus", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });

    const { PATCH } = await import("@/app/api/orders/[id]/route");
    const response = await PATCH(patchRequest("1", { status: "READY" }), makeParams("1"));

    expect(response.status).toBe(401);
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
  });

  it("пропускает ORDER_MANAGER и возвращает обновлённый заказ", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ORDER_MANAGER" });
    const order = { id: 1, status: "READY" };
    updateOrderStatusMock.mockResolvedValueOnce(order);

    const { PATCH } = await import("@/app/api/orders/[id]/route");
    const response = await PATCH(patchRequest("1", { status: "READY" }), makeParams("1"));

    expect(updateOrderStatusMock).toHaveBeenCalledWith(1, "READY");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(order);
  });

  it("возвращает 400 при некорректном статусе", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { PATCH } = await import("@/app/api/orders/[id]/route");
    const response = await PATCH(patchRequest("1", { status: "NOT_A_STATUS" }), makeParams("1"));

    expect(response.status).toBe(400);
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
  });

  it("возвращает 404, если заказ не найден", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    updateOrderStatusMock.mockResolvedValueOnce(null);

    const { PATCH } = await import("@/app/api/orders/[id]/route");
    const response = await PATCH(patchRequest("999999", { status: "READY" }), makeParams("999999"));

    expect(response.status).toBe(404);
  });

  it("возвращает 500, если updateOrderStatus падает", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    updateOrderStatusMock.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { PATCH } = await import("@/app/api/orders/[id]/route");
    const response = await PATCH(patchRequest("1", { status: "READY" }), makeParams("1"));

    expect(response.status).toBe(500);
  });
});
