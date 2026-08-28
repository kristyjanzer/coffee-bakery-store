import { describe, expect, it, vi, beforeEach } from "vitest";

const orderFindManyMock = vi.hoisted(() => vi.fn());
const orderItemGroupByMock = vi.hoisted(() => vi.fn());
const productFindManyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findMany: orderFindManyMock },
    orderItem: { groupBy: orderItemGroupByMock },
    product: { findMany: productFindManyMock },
  },
}));

beforeEach(() => {
  orderFindManyMock.mockReset();
  orderItemGroupByMock.mockReset();
  productFindManyMock.mockReset();
});

describe("getDashboardSummary", () => {
  it("нули без деления на ноль при пустой БД", async () => {
    orderFindManyMock.mockResolvedValue([]);
    const { getDashboardSummary } = await import("@/lib/dashboardStats");
    const s = await getDashboardSummary();
    expect(s).toMatchObject({ ordersToday: 0, revenueToday: 0, avgCheckToday: 0 });
  });

  it("средний чек = выручка / кол-во", async () => {
    const now = new Date();
    orderFindManyMock.mockResolvedValue([
      { createdAt: now, totalAmount: 300 },
      { createdAt: now, totalAmount: 500 },
    ]);
    const { getDashboardSummary } = await import("@/lib/dashboardStats");
    const s = await getDashboardSummary();
    expect(s.avgCheckToday).toBe(400);
  });
});

describe("getSalesChart", () => {
  it("days → 7 точек", async () => {
    orderFindManyMock.mockResolvedValue([]);
    const { getSalesChart } = await import("@/lib/dashboardStats");
    expect(await getSalesChart("days")).toHaveLength(7);
  });
  it("weeks → 8 точек, months → 6 точек", async () => {
    orderFindManyMock.mockResolvedValue([]);
    const { getSalesChart } = await import("@/lib/dashboardStats");
    expect(await getSalesChart("weeks")).toHaveLength(8);
    expect(await getSalesChart("months")).toHaveLength(6);
  });
  it("суммирует выручку в правильный бакет дня", async () => {
    const today = new Date();
    orderFindManyMock.mockResolvedValue([{ createdAt: today, totalAmount: 1000 }]);
    const { getSalesChart } = await import("@/lib/dashboardStats");
    const points = await getSalesChart("days");
    expect(points[points.length - 1].revenue).toBe(1000);
  });
});

describe("getTopProducts", () => {
  it("склеивает groupBy с именами товаров", async () => {
    orderItemGroupByMock.mockResolvedValue([{ productId: 5, _sum: { quantity: 42 } }]);
    productFindManyMock.mockResolvedValue([{ id: 5, name: "Латте" }]);
    const { getTopProducts } = await import("@/lib/dashboardStats");
    expect(await getTopProducts()).toEqual([{ id: 5, name: "Латте", unitsSold: 42 }]);
  });
});

describe("getPendingOrders", () => {
  it("возвращает до 4 заказов со статусом NEW/IN_PROGRESS", async () => {
    orderFindManyMock.mockResolvedValue([
      { id: 1, customerName: "А", totalAmount: 100, status: "NEW", createdAt: new Date(), items: [{ productNameSnapshot: "Кофе", quantity: 2 }] },
    ]);
    const { getPendingOrders } = await import("@/lib/dashboardStats");
    const [o] = await getPendingOrders();
    expect(o).toMatchObject({ id: 1, itemsSummary: "Кофе × 2", status: "NEW" });
  });
});
