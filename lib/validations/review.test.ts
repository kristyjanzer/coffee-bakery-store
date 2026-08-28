import { describe, expect, it } from "vitest";
import { moderateReviewSchema } from "@/lib/validations/review";

describe("moderateReviewSchema", () => {
  it("принимает минимальный payload (только isApproved)", () => {
    expect(moderateReviewSchema.safeParse({ isApproved: true }).success).toBe(true);
  });

  it("принимает shopReply и imageUrl", () => {
    const result = moderateReviewSchema.safeParse({
      isApproved: true,
      shopReply: "Спасибо!",
      imageUrl: "https://res.cloudinary.com/x/photo.avif",
    });
    expect(result.success).toBe(true);
  });

  it("принимает imageUrl: null (убрать фото)", () => {
    expect(moderateReviewSchema.safeParse({ isApproved: false, imageUrl: null }).success).toBe(true);
  });

  it("отклоняет imageUrl длиннее 500 символов", () => {
    expect(
      moderateReviewSchema.safeParse({ isApproved: true, imageUrl: `https://x/${"a".repeat(500)}` })
        .success
    ).toBe(false);
  });

  it("обрезает пробелы по краям imageUrl", () => {
    const result = moderateReviewSchema.safeParse({
      isApproved: true,
      imageUrl: "  https://res.cloudinary.com/x/photo.avif  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.imageUrl).toBe("https://res.cloudinary.com/x/photo.avif");
    }
  });
});
