import { describe, expect, it, vi, afterEach } from "vitest";
import {
  getOrders,
  getOrderById,
  getCustomerOrderHistory,
  submitOrder,
  updateOrderStatus,
  ORDER_STATUSES,
} from "@/lib/orders";
import type { OrderFormValues } from "@/lib/validations/order";
import type { CartItem } from "@/stores/cartStore";

describe("getOrders", () => {
  it("возвращает заказы, отсортированные от новых к старым (по minutesAgo)", async () => {
    const orders = await getOrders();
    expect(orders.length).toBeGreaterThan(0);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i].minutesAgo).toBeGreaterThanOrEqual(orders[i - 1].minutesAgo);
    }
  });

  it("фильтрует по статусу, если он передан", async () => {
    const newOrders = await getOrders("NEW");
    expect(newOrders.length).toBeGreaterThan(0);
    expect(newOrders.every((order) => order.status === "NEW")).toBe(true);
  });
});

describe("getOrderById", () => {
  it("находит заказ по существующему id", async () => {
    const order = await getOrderById(1042);
    expect(order?.customerName).toBe("Анна Смирнова");
  });

  it("возвращает undefined для несуществующего id", async () => {
    expect(await getOrderById(999999)).toBeUndefined();
  });
});

describe("getCustomerOrderHistory", () => {
  it("возвращает другие заказы того же клиента, кроме текущего", async () => {
    const history = await getCustomerOrderHistory("+7 900 123-45-01", 1042);
    expect(history.length).toBeGreaterThan(0);
    expect(history.every((order) => order.customerContact === "+7 900 123-45-01")).toBe(true);
    expect(history.some((order) => order.id === 1042)).toBe(false);
  });

  it("возвращает пустой массив для контакта без истории", async () => {
    expect(await getCustomerOrderHistory("+7 000 000-00-00", 1)).toEqual([]);
  });
});

describe("submitOrder", () => {
  const form: OrderFormValues = {
    customerName: "Анна Смирнова",
    customerContact: "+7 900 123-45-01",
    email: "anna@example.com",
    comment: "без сахара",
    preferredDate: "",
  };
  const items: CartItem[] = [
    { productId: 1, name: "Эспрессо", price: 200, imageUrl: "", quantity: 2, unit: "" },
    { productId: 6, name: "Капучино", price: 270, imageUrl: "", quantity: 1, unit: "" },
  ];

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("шлёт POST /api/orders только с productId+quantity (без цены) и возвращает orderId", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ orderId: 42 }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitOrder({ form, items, totalPrice: 670 });

    expect(result).toEqual({ ok: true, orderId: 42 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/orders");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.customerName).toBe("Анна Смирнова");
    expect(body.items).toEqual([
      { productId: 1, quantity: 2 },
      { productId: 6, quantity: 1 },
    ]);
    expect(JSON.stringify(body)).not.toContain("price");
  });

  it("возвращает ok:false с текстом ошибки сервера при не-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Товар #1 недоступен" }) })
    );

    const result = await submitOrder({ form, items, totalPrice: 670 });

    expect(result).toEqual({ ok: false, error: "Товар #1 недоступен" });
  });

  it("возвращает ok:false с понятным текстом при обрыве сети", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("Failed to fetch")));

    const result = await submitOrder({ form, items, totalPrice: 670 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("связ");
    }
  });
});

describe("updateOrderStatus", () => {
  it("резолвится с success: true", async () => {
    vi.useFakeTimers();
    const pending = updateOrderStatus(1042, "IN_PROGRESS");
    await vi.advanceTimersByTimeAsync(500);
    await expect(pending).resolves.toEqual({ success: true });
    vi.useRealTimers();
  });
});

describe("ORDER_STATUSES", () => {
  it("содержит все 6 статусов в ожидаемом порядке", () => {
    expect(ORDER_STATUSES).toEqual(["NEW", "IN_PROGRESS", "PREPARING", "READY", "DELIVERED", "CANCELLED"]);
  });
});
