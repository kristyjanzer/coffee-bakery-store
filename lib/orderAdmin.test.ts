import { describe, expect, it, vi, beforeEach } from "vitest";

const findManyMock = vi.hoisted(() => vi.fn());
const findUniqueMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { order: { findMany: findManyMock, findUnique: findUniqueMock, update: updateMock } },
}));

beforeEach(() => {
  findUniqueMock.mockReset();
  updateMock.mockReset();
});

describe("getOrders", () => {
  it("без статуса запрашивает все заказы, отсортированные от новых к старым", async () => {
    const rows = [{ id: 1, status: "NEW", items: [] }];
    findManyMock.mockResolvedValueOnce(rows);

    const { getOrders } = await import("@/lib/orderAdmin");
    const orders = await getOrders();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined, orderBy: { createdAt: "desc" } })
    );
    expect(orders).toEqual(rows);
  });

  it("фильтрует по статусу, если он передан", async () => {
    findManyMock.mockResolvedValueOnce([]);

    const { getOrders } = await import("@/lib/orderAdmin");
    await getOrders("NEW");

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "NEW" } })
    );
  });
});

describe("getOrderById", () => {
  it("возвращает заказ по id", async () => {
    const order = { id: 1, status: "NEW", items: [] };
    findUniqueMock.mockResolvedValueOnce(order);

    const { getOrderById } = await import("@/lib/orderAdmin");
    const result = await getOrderById(1);

    expect(findUniqueMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
    expect(result).toEqual(order);
  });

  it("возвращает null, если заказ не найден", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const { getOrderById } = await import("@/lib/orderAdmin");
    expect(await getOrderById(999999)).toBeNull();
  });
});

describe("getCustomerOrderHistory", () => {
  it("запрашивает заказы того же контакта, исключая текущий, от новых к старым", async () => {
    findManyMock.mockResolvedValueOnce([]);

    const { getCustomerOrderHistory } = await import("@/lib/orderAdmin");
    await getCustomerOrderHistory("+7 900 123-45-01", 42);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerContact: "+7 900 123-45-01", id: { not: 42 } },
        orderBy: { createdAt: "desc" },
      })
    );
  });
});

describe("getOrdersByCustomerId", () => {
  it("запрашивает заказы по customerId, от новых к старым", async () => {
    const rows = [{ id: 5, status: "NEW", items: [] }];
    findManyMock.mockResolvedValueOnce(rows);

    const { getOrdersByCustomerId } = await import("@/lib/orderAdmin");
    const result = await getOrdersByCustomerId(7);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: 7 },
        orderBy: { createdAt: "desc" },
      })
    );
    expect(result).toEqual(rows);
  });
});

describe("updateOrderStatus", () => {
  it("возвращает null и не вызывает update, если заказ не найден", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const { updateOrderStatus } = await import("@/lib/orderAdmin");
    const result = await updateOrderStatus(999999, "READY");

    expect(result).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("обновляет статус существующего заказа", async () => {
    findUniqueMock.mockResolvedValueOnce({ id: 1 });
    const updated = { id: 1, status: "READY", items: [] };
    updateMock.mockResolvedValueOnce(updated);

    const { updateOrderStatus } = await import("@/lib/orderAdmin");
    const result = await updateOrderStatus(1, "READY");

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { status: "READY" } })
    );
    expect(result).toEqual(updated);
  });
});
