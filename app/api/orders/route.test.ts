import { describe, expect, it, vi, beforeEach } from "vitest";

const createOrderMock = vi.hoisted(() => vi.fn());
const getOrdersMock = vi.hoisted(() => vi.fn());
const requireAdminSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/orderCreation", () => ({
  createOrder: createOrderMock,
}));

vi.mock("@/lib/server/orderAdmin", () => ({
  getOrders: getOrdersMock,
}));

vi.mock("@/lib/auth/auth", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

beforeEach(() => {
  createOrderMock.mockReset();
  getOrdersMock.mockReset();
  requireAdminSessionMock.mockReset();
});

function getRequest(url = "http://localhost/api/orders") {
  return new Request(url);
}

const validBody = {
  customerName: "Анна Смирнова",
  customerContact: "+7 900 123-45-01",
  email: "anna@example.com",
  comment: "",
  preferredDate: "",
  items: [{ productId: 1, quantity: 2 }],
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/orders", () => {
  it("возвращает 201 и orderId при успешном создании", async () => {
    createOrderMock.mockResolvedValueOnce({ ok: true, orderId: 42 });

    const { POST } = await import("@/app/api/orders/route");
    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ orderId: 42 });
  });

  it("возвращает 400, если тело запроса не проходит валидацию", async () => {
    const { POST } = await import("@/app/api/orders/route");
    const response = await POST(postRequest({ ...validBody, customerName: "" }));

    expect(response.status).toBe(400);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("возвращает 400, если createOrder сообщает о недоступном товаре/нехватке остатка", async () => {
    createOrderMock.mockResolvedValueOnce({ ok: false, error: "Товар #1 недоступен" });

    const { POST } = await import("@/app/api/orders/route");
    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Товар #1 недоступен" });
  });

  it("возвращает 400 при некорректном JSON", async () => {
    const { POST } = await import("@/app/api/orders/route");
    const request = new Request("http://localhost/api/orders", {
      method: "POST",
      body: "not json",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("возвращает 500, если createOrder падает", async () => {
    createOrderMock.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { POST } = await import("@/app/api/orders/route");
    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(500);
  });
});

describe("GET /api/orders", () => {
  it("возвращает 401 без сессии, не вызывая getOrders", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });

    const { GET } = await import("@/app/api/orders/route");
    const response = await GET(getRequest());

    expect(response.status).toBe(401);
    expect(getOrdersMock).not.toHaveBeenCalled();
  });

  it("пропускает ORDER_MANAGER (не только ADMIN)", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ORDER_MANAGER" });
    getOrdersMock.mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/orders/route");
    const response = await GET(getRequest());

    expect(requireAdminSessionMock).toHaveBeenCalledWith(["ADMIN", "ORDER_MANAGER"]);
    expect(response.status).toBe(200);
  });

  it("возвращает 200 и список заказов для ADMIN без фильтра", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    const orders = [{ id: 1, status: "NEW" }];
    getOrdersMock.mockResolvedValueOnce(orders);

    const { GET } = await import("@/app/api/orders/route");
    const response = await GET(getRequest());

    expect(getOrdersMock).toHaveBeenCalledWith(undefined);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(orders);
  });

  it("передаёт валидный ?status= в getOrders", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    getOrdersMock.mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/orders/route");
    await GET(getRequest("http://localhost/api/orders?status=NEW"));

    expect(getOrdersMock).toHaveBeenCalledWith("NEW");
  });

  it("возвращает 400 при некорректном ?status=", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { GET } = await import("@/app/api/orders/route");
    const response = await GET(getRequest("http://localhost/api/orders?status=NOT_A_STATUS"));

    expect(response.status).toBe(400);
    expect(getOrdersMock).not.toHaveBeenCalled();
  });

  it("возвращает 500, если getOrders падает", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    getOrdersMock.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { GET } = await import("@/app/api/orders/route");
    const response = await GET(getRequest());

    expect(response.status).toBe(500);
  });
});
