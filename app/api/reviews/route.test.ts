import { describe, expect, it, vi } from "vitest";

const getApprovedReviewsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/reviewsApi", () => ({
  getApprovedReviews: getApprovedReviewsMock,
}));

describe("GET /api/reviews", () => {
  it("возвращает 200 и список одобренных отзывов из lib/reviewsApi", async () => {
    const reviews = [{ id: 1, authorName: "Марина К.", quoteText: "Вкусно", isApproved: true }];
    getApprovedReviewsMock.mockResolvedValueOnce(reviews);

    const { GET } = await import("@/app/api/reviews/route");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(reviews);
  });

  it("возвращает 500, если запрос к БД падает", async () => {
    getApprovedReviewsMock.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { GET } = await import("@/app/api/reviews/route");
    const response = await GET();

    expect(response.status).toBe(500);
  });
});
