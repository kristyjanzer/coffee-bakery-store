import { describe, expect, it } from "vitest";
import { formatTimeAgo } from "@/lib/utils";

describe("formatTimeAgo", () => {
  const now = new Date("2026-08-27T12:00:00Z");

  it("показывает минуты в пределах часа", () => {
    expect(formatTimeAgo(new Date("2026-08-27T11:25:00Z"), now)).toBe("35 мин назад");
  });

  it("показывает часы в пределах суток", () => {
    expect(formatTimeAgo(new Date("2026-08-27T04:00:00Z"), now)).toBe("8 ч назад");
  });

  it("показывает дни свыше суток", () => {
    expect(formatTimeAgo(new Date("2026-08-24T12:00:00Z"), now)).toBe("3 дн назад");
  });

  it("не уходит в отрицательные значения для даты из будущего", () => {
    expect(formatTimeAgo(new Date("2026-08-27T12:05:00Z"), now)).toBe("0 мин назад");
  });
});
