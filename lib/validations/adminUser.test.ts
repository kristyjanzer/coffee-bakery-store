import { describe, expect, it } from "vitest";
import { createAdminUserSchema, updateAdminUserRoleSchema } from "@/lib/validations/adminUser";

describe("createAdminUserSchema", () => {
  it("принимает валидные данные", () => {
    const result = createAdminUserSchema.safeParse({
      email: "manager@example.com",
      password: "supersecret",
      role: "ORDER_MANAGER",
    });
    expect(result.success).toBe(true);
  });

  it("отклоняет пароль короче 8 символов", () => {
    const result = createAdminUserSchema.safeParse({
      email: "manager@example.com",
      password: "short",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет неизвестную роль", () => {
    const result = createAdminUserSchema.safeParse({
      email: "manager@example.com",
      password: "supersecret",
      role: "SUPERUSER",
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет некорректный email", () => {
    const result = createAdminUserSchema.safeParse({
      email: "not-an-email",
      password: "supersecret",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateAdminUserRoleSchema", () => {
  it("принимает валидную роль", () => {
    expect(updateAdminUserRoleSchema.safeParse({ role: "ADMIN" }).success).toBe(true);
  });

  it("отклоняет неизвестную роль", () => {
    expect(updateAdminUserRoleSchema.safeParse({ role: "GUEST" }).success).toBe(false);
  });
});
