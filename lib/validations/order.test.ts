import { describe, expect, it } from "vitest";
import { orderFormSchema, orderFormDefaultValues, createOrderSchema } from "@/lib/validations/order";

const validPayload = {
  customerName: "Анна Смирнова",
  customerContact: "+7 900 123-45-01",
  email: "anna@example.com",
  comment: "Без сахара",
  preferredDate: "",
};

describe("orderFormSchema — валидные данные", () => {
  it("принимает полностью заполненный валидный payload", () => {
    expect(orderFormSchema.safeParse(validPayload).success).toBe(true);
  });

  it("принимает пустые необязательные поля comment/preferredDate", () => {
    const result = orderFormSchema.safeParse({ ...validPayload, comment: "", preferredDate: "" });
    expect(result.success).toBe(true);
  });

  it("обрезает пробелы по краям customerName", () => {
    const result = orderFormSchema.safeParse({ ...validPayload, customerName: "  Анна  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerName).toBe("Анна");
    }
  });
});

describe("orderFormSchema — невалидные данные", () => {
  it("отклоняет слишком короткое имя", () => {
    expect(orderFormSchema.safeParse({ ...validPayload, customerName: "А" }).success).toBe(false);
  });

  it("отклоняет телефон с недописанными цифрами", () => {
    expect(orderFormSchema.safeParse({ ...validPayload, customerContact: "+7 900" }).success).toBe(false);
  });

  it("отклоняет некорректный email", () => {
    expect(orderFormSchema.safeParse({ ...validPayload, email: "not-an-email" }).success).toBe(false);
  });

  it("отклоняет пустой email", () => {
    expect(orderFormSchema.safeParse({ ...validPayload, email: "" }).success).toBe(false);
  });

  it("отклоняет comment длиннее 500 символов", () => {
    expect(orderFormSchema.safeParse({ ...validPayload, comment: "а".repeat(501) }).success).toBe(false);
  });
});

describe("orderFormDefaultValues", () => {
  it("не проходит валидацию как есть — обязательные поля пустые", () => {
    expect(orderFormSchema.safeParse(orderFormDefaultValues).success).toBe(false);
  });

  it("все значения по умолчанию — пустые строки", () => {
    expect(Object.values(orderFormDefaultValues).every((value) => value === "")).toBe(true);
  });
});

describe("createOrderSchema", () => {
  const validOrder = { ...validPayload, items: [{ productId: 1, quantity: 2 }] };

  it("принимает валидный payload с товарами", () => {
    expect(createOrderSchema.safeParse(validOrder).success).toBe(true);
  });

  it("отклоняет пустую корзину", () => {
    expect(createOrderSchema.safeParse({ ...validOrder, items: [] }).success).toBe(false);
  });

  it("отклоняет нецелое/неположительное количество", () => {
    expect(
      createOrderSchema.safeParse({ ...validOrder, items: [{ productId: 1, quantity: 0 }] }).success
    ).toBe(false);
  });

  it("отклоняет абсурдное количество одной позиции", () => {
    expect(
      createOrderSchema.safeParse({ ...validOrder, items: [{ productId: 1, quantity: 1_000_000 }] })
        .success
    ).toBe(false);
  });

  it("отклоняет слишком много позиций в заказе", () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ productId: i + 1, quantity: 1 }));
    expect(createOrderSchema.safeParse({ ...validOrder, items }).success).toBe(false);
  });

  it("отклоняет некорректную дату предзаказа", () => {
    expect(
      createOrderSchema.safeParse({ ...validOrder, preferredDate: "не дата" }).success
    ).toBe(false);
  });

  it("принимает корректную дату предзаказа", () => {
    expect(
      createOrderSchema.safeParse({ ...validOrder, preferredDate: "2026-09-01" }).success
    ).toBe(true);
  });
});
