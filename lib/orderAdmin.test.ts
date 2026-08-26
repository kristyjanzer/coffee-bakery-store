import { describe, expect, it, vi } from "vitest";

const findManyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { order: { findMany: findManyMock } },
}));

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
