import { describe, expect, it } from "vitest";
import { productFormSchema } from "@/lib/validations/product";

const validPayload = {
  name: "Капучино",
  categorySlug: "kofe",
  price: "270",
  stockQuantity: "10",
  imageUrl: "",
  volumeMl: "400",
  weightG: "",
  calories: "",
  description: "",
  composition: "",
  allergens: "",
  protein: "",
  fat: "",
  carbs: "",
  expiryInfo: "",
  isSeasonal: false,
  isActive: true,
};

describe("productFormSchema — валидные данные", () => {
  it("принимает валидный payload формы", () => {
    expect(productFormSchema.safeParse(validPayload).success).toBe(true);
  });

  it("приводит числовые строки к number", () => {
    const result = productFormSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(270);
      expect(result.data.stockQuantity).toBe(10);
      expect(result.data.volumeMl).toBe(400);
    }
  });

  it("пустая строка в необязательном числовом поле даёт undefined, а не ошибку", () => {
    const result = productFormSchema.safeParse({ ...validPayload, stockQuantity: "", volumeMl: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stockQuantity).toBeUndefined();
      expect(result.data.volumeMl).toBeUndefined();
    }
  });
});

describe("productFormSchema — невалидные данные", () => {
  it("отклоняет слишком короткое название", () => {
    expect(productFormSchema.safeParse({ ...validPayload, name: "К" }).success).toBe(false);
  });

  it("отклоняет пустую категорию", () => {
    expect(productFormSchema.safeParse({ ...validPayload, categorySlug: "" }).success).toBe(false);
  });

  it("отклоняет нулевую и отрицательную цену", () => {
    expect(productFormSchema.safeParse({ ...validPayload, price: "0" }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...validPayload, price: "-10" }).success).toBe(false);
  });

  it("отклоняет пустую цену (обязательное поле)", () => {
    expect(productFormSchema.safeParse({ ...validPayload, price: "" }).success).toBe(false);
  });

  it("отклоняет отрицательный stockQuantity", () => {
    expect(productFormSchema.safeParse({ ...validPayload, stockQuantity: "-5" }).success).toBe(false);
  });

  it("отклоняет нечисловую строку в числовом поле", () => {
    expect(productFormSchema.safeParse({ ...validPayload, price: "бесплатно" }).success).toBe(false);
  });
});
