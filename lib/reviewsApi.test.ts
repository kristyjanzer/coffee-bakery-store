import { describe, expect, it, vi, beforeEach } from "vitest";

const findManyMock = vi.hoisted(() => vi.fn());
const findUniqueMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    review: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      update: updateMock,
    },
  },
}));

beforeEach(() => {
  findManyMock.mockReset();
  findUniqueMock.mockReset();
  updateMock.mockReset();
});

describe("getApprovedReviews", () => {
  it("запрашивает только одобренные отзывы и разворачивает product.name в productName", async () => {
    findManyMock.mockResolvedValueOnce([
      { id: 1, productId: 5, authorName: "Марина К.", quoteText: "Вкусно", rating: 5, imageUrl: null, isApproved: true, shopReply: null, createdAt: new Date(0), product: { name: "Круассан" } },
      { id: 2, productId: null, authorName: "Игорь П.", quoteText: "Отлично", rating: null, imageUrl: null, isApproved: true, shopReply: null, createdAt: new Date(0), product: null },
    ]);

    const { getApprovedReviews } = await import("@/lib/reviewsApi");
    const reviews = await getApprovedReviews();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isApproved: true } })
    );
    expect(reviews[0].productName).toBe("Круассан");
    expect(reviews[1].productName).toBeNull();
    expect(reviews[0]).not.toHaveProperty("product");
  });
});

describe("moderateReview", () => {
  it("возвращает null, если отзыв не найден, и не вызывает update", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const { moderateReview } = await import("@/lib/reviewsApi");
    const result = await moderateReview(999999, { isApproved: true });

    expect(result).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("обновляет статус и ответ магазина, возвращает плоский ApiReview", async () => {
    findUniqueMock.mockResolvedValueOnce({ id: 1 });
    updateMock.mockResolvedValueOnce({
      id: 1, productId: 5, authorName: "Ольга Т.", quoteText: "Штрудель — как у бабушки",
      rating: null, imageUrl: null, isApproved: true, shopReply: "Спасибо!", createdAt: new Date(0),
      product: { name: "Штрудель яблочный" },
    });

    const { moderateReview } = await import("@/lib/reviewsApi");
    const result = await moderateReview(1, { isApproved: true, shopReply: "Спасибо!" });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { isApproved: true, shopReply: "Спасибо!" },
      })
    );
    expect(result).toMatchObject({ id: 1, isApproved: true, shopReply: "Спасибо!", productName: "Штрудель яблочный" });
  });
});
