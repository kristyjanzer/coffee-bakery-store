import { describe, expect, it } from "vitest";
import { updateOrderStatusSchema } from "@/lib/validations/orderStatus";

describe("updateOrderStatusSchema", () => {
  it("принимает каждый реальный статус заказа", () => {
    for (const status of ["NEW", "IN_PROGRESS", "PREPARING", "READY", "DELIVERED", "CANCELLED"]) {
      expect(updateOrderStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("отклоняет несуществующий статус", () => {
    expect(updateOrderStatusSchema.safeParse({ status: "NOT_A_STATUS" }).success).toBe(false);
  });

  it("отклоняет тело без status", () => {
    expect(updateOrderStatusSchema.safeParse({}).success).toBe(false);
  });
});
