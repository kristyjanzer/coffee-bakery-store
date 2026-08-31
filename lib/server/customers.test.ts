import { describe, expect, it, vi, beforeEach } from "vitest";

const findManyMock = vi.hoisted(() => vi.fn());
const findUniqueMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { customer: { findMany: findManyMock, findUnique: findUniqueMock } },
}));

beforeEach(() => {
  findManyMock.mockReset();
  findUniqueMock.mockReset();
});

const row = {
  id: 3,
  name: "Анна",
  phone: "+79001234501",
  email: "anna@e.com",
  deliveryAddress: null,
  orders: [
    { totalAmount: 500, createdAt: new Date("2026-08-20T10:00:00Z") },
    { totalAmount: 300, createdAt: new Date("2026-08-25T10:00:00Z") },
  ],
};

describe("getCustomers", () => {
  it("считает кол-во заказов, сумму и дату последнего", async () => {
    findManyMock.mockResolvedValueOnce([row]);
    const { getCustomers } = await import("@/lib/server/customers");
    const [c] = await getCustomers();
    expect(c).toMatchObject({
      id: 3,
      name: "Анна",
      ordersCount: 2,
      totalSpent: 800,
      lastOrderAt: new Date("2026-08-25T10:00:00Z"),
    });
  });

  it("клиент без заказов — нули и lastOrderAt null", async () => {
    findManyMock.mockResolvedValueOnce([{ ...row, orders: [] }]);
    const { getCustomers } = await import("@/lib/server/customers");
    const [c] = await getCustomers();
    expect(c).toMatchObject({ ordersCount: 0, totalSpent: 0, lastOrderAt: null });
  });
});

describe("getCustomerById", () => {
  it("возвращает null, если клиента нет", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const { getCustomerById } = await import("@/lib/server/customers");
    expect(await getCustomerById(999)).toBeNull();
  });
});
