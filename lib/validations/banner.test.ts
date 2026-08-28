import { describe, expect, it } from "vitest";
import { bannerListSchema } from "@/lib/validations/banner";

describe("bannerListSchema", () => {
  it("принимает пустой imageUrl, требует title/link", () => {
    expect(bannerListSchema.safeParse([
      { imageUrl: "", title: "Акция", link: "#menu", isActive: true },
    ]).success).toBe(true);
  });
  it("отклоняет пустой title", () => {
    expect(bannerListSchema.safeParse([
      { imageUrl: "", title: "", link: "#menu", isActive: true },
    ]).success).toBe(false);
  });
  it("принимает пустой массив (все баннеры удалены)", () => {
    expect(bannerListSchema.safeParse([]).success).toBe(true);
  });
});
