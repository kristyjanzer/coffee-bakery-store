import { describe, expect, it, vi, beforeEach } from "vitest";
import { createOrder } from "@/lib/orderCreation";
import type { CreateOrderInput } from "@/lib/validations/order";

const findManyMock = vi.hoisted(() => vi.fn());
const createMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { product: { findMany: findManyMock }, order: { create: createMock } },
}));

beforeEach(() => {
  findManyMock.mockReset();
  createMock.mockReset();
});

const baseInput: CreateOrderInput = {
  customerName: "Анна Смирнова",
  customerContact: "+7 900 123-45-01",
  email: "anna@example.com",
  comment: "Без сахара",
  preferredDate: "",
  items: [{ productId: 1, quantity: 2 }],
};

describe("createOrder", () => {
  it("создаёт заказ со снимком имени/цены товара из Prisma, а не из входных данных", async () => {
    findManyMock.mockResolvedValueOnce([
      { id: 1, name: "Двойной эспрессо", price: 200, stockQuantity: null },
    ]);
    createMock.mockResolvedValueOnce({ id: 42 });

    const result = await createOrder(baseInput);

    expect(result).toEqual({ ok: true, orderId: 42 });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerEmail: "anna@example.com",
          totalAmount: 400,
          items: {
            create: [
              {
                productId: 1,
                productNameSnapshot: "Двойной эспрессо",
                priceSnapshot: 200,
                quantity: 2,
              },
            ],
          },
        }),
      })
    );
  });

  it("возвращает ok:false и не создаёт заказ, если товара нет/он неактивен", async () => {
    findManyMock.mockResolvedValueOnce([]);

    const result = await createOrder(baseInput);

    expect(result.ok).toBe(false);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("возвращает ok:false и не создаёт заказ при нехватке остатка", async () => {
    findManyMock.mockResolvedValueOnce([
      { id: 1, name: "Круассан", price: 150, stockQuantity: 1 },
    ]);

    const result = await createOrder(baseInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Круассан");
    }
    expect(createMock).not.toHaveBeenCalled();
  });

  it("преобразует пустой comment/preferredDate в null", async () => {
    findManyMock.mockResolvedValueOnce([
      { id: 1, name: "Двойной эспрессо", price: 200, stockQuantity: null },
    ]);
    createMock.mockResolvedValueOnce({ id: 1 });

    await createOrder({ ...baseInput, comment: "", preferredDate: "" });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ comment: null, preferredDate: null }),
      })
    );
  });
});
