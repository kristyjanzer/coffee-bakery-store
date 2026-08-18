import { describe, expect, it, vi } from "vitest";
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
  it("резолвится с success: true", async () => {
    vi.useFakeTimers();
    const form: OrderFormValues = {
      customerName: "Тест Тестов",
      customerContact: "+7 900 000-00-00",
      email: "test@example.com",
      comment: "",
      preferredDate: "",
    };
    const items: CartItem[] = [
      { productId: 1, name: "Эспрессо", price: 200, imageUrl: "", quantity: 1, unit: "" },
    ];
    const pending = submitOrder({ form, items, totalPrice: 200 });
    await vi.advanceTimersByTimeAsync(600);
    await expect(pending).resolves.toEqual({ success: true });
    vi.useRealTimers();
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
