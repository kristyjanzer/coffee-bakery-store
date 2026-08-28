import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/validations/order";

describe("normalizePhone", () => {
  it("приводит 8-начальный номер к +7", () => {
    expect(normalizePhone("8 (900) 123-45-67")).toBe("+79001234567");
  });
  it("приводит +7 и 7 к единому виду", () => {
    expect(normalizePhone("+7 900 123 45 67")).toBe("+79001234567");
    expect(normalizePhone("79001234567")).toBe("+79001234567");
  });
  it("оставляет как есть строку без 11 цифр (валидатор формы уже отсёк)", () => {
    expect(normalizePhone("123")).toBe("+7123");
  });
});
