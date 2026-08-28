import { describe, expect, it, vi, beforeEach } from "vitest";
import { createOrder } from "@/lib/orderCreation";
import { Prisma } from "@/generated/prisma/client";
import type { CreateOrderInput } from "@/lib/validations/order";

const findManyMock = vi.hoisted(() => vi.fn());
const createMock = vi.hoisted(() => vi.fn());
const customerUpsertMock = vi.hoisted(() => vi.fn());
// $transaction в проде получает колбэк и прогоняет его с tx-клиентом; в тесте
// отдаём тот же tx, где order.create / customer.upsert — те же моки, что и выше
// (правка мок-инфраструктуры под транзакцию в createOrder, не ослабление проверок).
const transactionMock = vi.hoisted(() =>
  vi.fn((cb: (tx: unknown) => unknown) =>
    cb({ customer: { upsert: customerUpsertMock }, order: { create: createMock } })
  )
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findMany: findManyMock },
    order: { create: createMock },
    customer: { upsert: customerUpsertMock },
    $transaction: transactionMock,
  },
}));

beforeEach(() => {
  findManyMock.mockReset();
  createMock.mockReset();
  customerUpsertMock.mockReset();
  customerUpsertMock.mockResolvedValue({ id: 1 }); // безобидный дефолт
  transactionMock.mockImplementation((cb: (tx: unknown) => unknown) =>
    cb({ customer: { upsert: customerUpsertMock }, order: { create: createMock } })
  );
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

describe("createOrder — связь с Customer", () => {
  it("делает upsert Customer по нормализованному телефону и проставляет customerId", async () => {
    findManyMock.mockResolvedValueOnce([
      { id: 1, name: "Двойной эспрессо", price: 200, stockQuantity: null },
    ]);
    customerUpsertMock.mockResolvedValueOnce({ id: 7 });
    createMock.mockResolvedValueOnce({ id: 100 });

    const result = await createOrder({
      ...baseInput,
      customerName: "Тест",
      customerContact: "8 (900) 123-45-67",
      email: "t@e.com",
    });

    expect(result).toEqual({ ok: true, orderId: 100 });
    expect(customerUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone: "+79001234567" },
        update: expect.objectContaining({ name: "Тест", email: "t@e.com" }),
        create: expect.objectContaining({ phone: "+79001234567", name: "Тест", email: "t@e.com" }),
      })
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ customerId: 7 }) })
    );
  });

  it("возвращает ok:false (не бросает) при коллизии unique-поля Prisma (P2002)", async () => {
    findManyMock.mockResolvedValueOnce([
      { id: 1, name: "Двойной эспрессо", price: 200, stockQuantity: null },
    ]);
    customerUpsertMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "x",
      })
    );

    const result = await createOrder(baseInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(typeof result.error).toBe("string");
      expect(result.error.length).toBeGreaterThan(0);
    }
    expect(createMock).not.toHaveBeenCalled();
  });

  it("пробрасывает не-P2002 ошибки БД (роут отдаст 500)", async () => {
    findManyMock.mockResolvedValueOnce([
      { id: 1, name: "Двойной эспрессо", price: 200, stockQuantity: null },
    ]);
    customerUpsertMock.mockRejectedValueOnce(new Error("connection reset"));

    await expect(createOrder(baseInput)).rejects.toThrow("connection reset");
  });
});
