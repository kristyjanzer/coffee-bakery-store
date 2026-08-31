import { describe, expect, it, vi, beforeEach } from "vitest";

const moderateReviewMock = vi.hoisted(() => vi.fn());
const requireAdminSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/reviewsApi", () => ({
  moderateReview: moderateReviewMock,
}));

vi.mock("@/lib/auth/auth", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

beforeEach(() => {
  moderateReviewMock.mockReset();
  requireAdminSessionMock.mockReset();
});

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/reviews/[id]", () => {
  it("возвращает 401 без сессии, не вызывая moderateReview", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });

    const { PATCH } = await import("@/app/api/reviews/[id]/route");
    const response = await PATCH(patchRequest("1", { isApproved: true }), makeParams("1"));

    expect(response.status).toBe(401);
    expect(moderateReviewMock).not.toHaveBeenCalled();
  });

  it("возвращает 403 для роли без прав (например, ORDER_MANAGER)", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 403 });

    const { PATCH } = await import("@/app/api/reviews/[id]/route");
    const response = await PATCH(patchRequest("1", { isApproved: true }), makeParams("1"));

    expect(response.status).toBe(403);
    expect(moderateReviewMock).not.toHaveBeenCalled();
  });

  it("возвращает 400 при нечисловом id", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { PATCH } = await import("@/app/api/reviews/[id]/route");
    const response = await PATCH(patchRequest("abc", { isApproved: true }), makeParams("abc"));

    expect(response.status).toBe(400);
    expect(moderateReviewMock).not.toHaveBeenCalled();
  });

  it("возвращает 400, если тело не проходит валидацию", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { PATCH } = await import("@/app/api/reviews/[id]/route");
    const response = await PATCH(patchRequest("1", { isApproved: "yes" }), makeParams("1"));

    expect(response.status).toBe(400);
    expect(moderateReviewMock).not.toHaveBeenCalled();
  });

  it("возвращает 200 и обновлённый отзыв для ADMIN с валидным телом", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    const review = { id: 1, isApproved: false, shopReply: "Спасибо за отзыв!" };
    moderateReviewMock.mockResolvedValueOnce(review);

    const { PATCH } = await import("@/app/api/reviews/[id]/route");
    const response = await PATCH(
      patchRequest("1", { isApproved: false, shopReply: "Спасибо за отзыв!" }),
      makeParams("1")
    );

    expect(moderateReviewMock).toHaveBeenCalledWith(1, {
      isApproved: false,
      shopReply: "Спасибо за отзыв!",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(review);
  });

  it("возвращает 404, если отзыв не найден", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    moderateReviewMock.mockResolvedValueOnce(null);

    const { PATCH } = await import("@/app/api/reviews/[id]/route");
    const response = await PATCH(patchRequest("999999", { isApproved: true }), makeParams("999999"));

    expect(response.status).toBe(404);
  });

  it("возвращает 500, если moderateReview падает", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    moderateReviewMock.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { PATCH } = await import("@/app/api/reviews/[id]/route");
    const response = await PATCH(patchRequest("1", { isApproved: true }), makeParams("1"));

    expect(response.status).toBe(500);
  });
});
