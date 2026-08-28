import { describe, expect, it } from "vitest";
import { notificationSettingsSchema } from "@/lib/validations/notificationSettings";

describe("notificationSettingsSchema", () => {
  it("принимает валидные настройки", () => {
    const result = notificationSettingsSchema.safeParse({
      notifyEmail: true,
      notifyEmailAddress: "orders@example.com",
      notifySms: false,
      notifySmsPhone: "",
    });
    expect(result.success).toBe(true);
  });

  it("отклоняет не-boolean флаг", () => {
    const result = notificationSettingsSchema.safeParse({
      notifyEmail: "yes",
      notifyEmailAddress: "orders@example.com",
      notifySms: false,
      notifySmsPhone: "",
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет отсутствующее поле", () => {
    const result = notificationSettingsSchema.safeParse({
      notifyEmail: true,
      notifyEmailAddress: "orders@example.com",
      notifySms: false,
    });
    expect(result.success).toBe(false);
  });
});
