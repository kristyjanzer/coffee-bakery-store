import { describe, expect, it } from "vitest";
import { loginFormSchema, loginFormDefaultValues } from "@/lib/validations/auth";

describe("loginFormSchema", () => {
  it("принимает валидные email и пароль", () => {
    expect(loginFormSchema.safeParse({ email: "admin@example.com", password: "secret123" }).success).toBe(true);
  });

  it("отклоняет некорректный email", () => {
    expect(loginFormSchema.safeParse({ email: "not-an-email", password: "secret123" }).success).toBe(false);
  });

  it("отклоняет пустой email", () => {
    expect(loginFormSchema.safeParse({ email: "", password: "secret123" }).success).toBe(false);
  });

  it("отклоняет пустой пароль", () => {
    expect(loginFormSchema.safeParse({ email: "admin@example.com", password: "" }).success).toBe(false);
  });

  it("обрезает пробелы по краям email", () => {
    const result = loginFormSchema.safeParse({ email: "  admin@example.com  ", password: "secret123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("admin@example.com");
    }
  });
});

describe("loginFormDefaultValues", () => {
  it("все поля — пустые строки", () => {
    expect(loginFormDefaultValues).toEqual({ email: "", password: "" });
  });
});
