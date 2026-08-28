import { describe, expect, it } from "vitest";
import { sitePageInputSchema } from "@/lib/validations/page";

describe("sitePageInputSchema", () => {
  it("принимает валидный контент", () => {
    expect(sitePageInputSchema.safeParse({
      title: "О нас", content: "текст", seoTitle: "О нас — Coffee Bakery", seoDescription: "описание",
    }).success).toBe(true);
  });
  it("отклоняет пустой title", () => {
    expect(sitePageInputSchema.safeParse({
      title: "", content: "т", seoTitle: "с", seoDescription: "о",
    }).success).toBe(false);
  });
});
