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

describe("getSliderReviews", () => {
  it("приводит одобренные отзывы к форме Review (productName/imageUrl — строки, не null)", async () => {
    findManyMock.mockResolvedValueOnce([
      { id: 2, productId: null, authorName: "Игорь П.", quoteText: "Отлично", rating: null, imageUrl: null, isApproved: true, shopReply: null, createdAt: new Date(0), product: null },
    ]);

    const { getSliderReviews } = await import("@/lib/reviewsApi");
    const reviews = await getSliderReviews();

    expect(reviews[0]).toEqual({
      id: 2,
      authorName: "Игорь П.",
      quoteText: "Отлично",
      productName: "",
      imageUrl: "",
      isApproved: true,
      shopReply: null,
    });
  });

  it("подставляет фото связанного товара, когда у отзыва нет своего imageUrl", async () => {
    findManyMock.mockResolvedValueOnce([
      {
        id: 1,
        productId: 5,
        authorName: "Марина К.",
        quoteText: "Вкусно",
        rating: 5,
        imageUrl: null,
        isApproved: true,
        shopReply: null,
        createdAt: new Date(0),
        product: { name: "Круассан", imageUrl: "https://res.cloudinary.com/x/croissant.avif" },
      },
    ]);

    const { getSliderReviews } = await import("@/lib/reviewsApi");
    const [review] = await getSliderReviews();

    expect(review.imageUrl).toBe("https://res.cloudinary.com/x/croissant.avif");
    expect(review.productName).toBe("Круассан");
  });

  it("своё imageUrl отзыва имеет приоритет над фото товара", async () => {
    findManyMock.mockResolvedValueOnce([
      {
        id: 1,
        productId: 5,
        authorName: "Марина К.",
        quoteText: "Вкусно",
        rating: 5,
        imageUrl: "https://res.cloudinary.com/x/own-review.avif",
        isApproved: true,
        shopReply: null,
        createdAt: new Date(0),
        product: { name: "Круассан", imageUrl: "https://res.cloudinary.com/x/croissant.avif" },
      },
    ]);

    const { getSliderReviews } = await import("@/lib/reviewsApi");
    const [review] = await getSliderReviews();

    expect(review.imageUrl).toBe("https://res.cloudinary.com/x/own-review.avif");
  });
});

describe("getAdminReviews", () => {
  it("без фильтра запрашивает все отзывы (where: undefined)", async () => {
    findManyMock.mockResolvedValueOnce([]);

    const { getAdminReviews } = await import("@/lib/reviewsApi");
    await getAdminReviews();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined, orderBy: { createdAt: "desc" } })
    );
  });

  it("с фильтром isApproved:false запрашивает только отзывы на модерации", async () => {
    findManyMock.mockResolvedValueOnce([]);

    const { getAdminReviews } = await import("@/lib/reviewsApi");
    await getAdminReviews({ isApproved: false });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isApproved: false } })
    );
  });
});

describe("getAdminReviewById", () => {
  it("возвращает null, если отзыв не найден", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const { getAdminReviewById } = await import("@/lib/reviewsApi");
    expect(await getAdminReviewById(999999)).toBeNull();
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

  it("прокидывает imageUrl в prisma.review.update (null — убрать фото)", async () => {
    findUniqueMock.mockResolvedValueOnce({ id: 1 });
    updateMock.mockResolvedValueOnce({
      id: 1, productId: 5, authorName: "Ольга Т.", quoteText: "Вкусно",
      rating: null, imageUrl: null, isApproved: true, shopReply: null, createdAt: new Date(0),
      product: { name: "Штрудель", imageUrl: null },
    });

    const { moderateReview } = await import("@/lib/reviewsApi");
    await moderateReview(1, { isApproved: true, imageUrl: null });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ imageUrl: null }) })
    );
  });
});
