import { describe, expect, it, vi, beforeEach } from "vitest";

const createOrderMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/orderCreation", () => ({
  createOrder: createOrderMock,
}));

beforeEach(() => {
  createOrderMock.mockReset();
});

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
