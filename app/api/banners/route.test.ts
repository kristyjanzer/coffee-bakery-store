import { beforeEach, describe, expect, it, vi } from "vitest";

const transactionMock = vi.hoisted(() => vi.fn());
const deleteManyMock = vi.hoisted(() => vi.fn());
const createManyMock = vi.hoisted(() => vi.fn());
const requireAdminSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    banner: { deleteMany: deleteManyMock, createMany: createManyMock },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

function putRequest(body: unknown) {
  return new Request("http://localhost/api/banners", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

const validList = [
  { imageUrl: "", title: "Акция", link: "#menu", isActive: true },
  { imageUrl: "https://x/y.jpg", title: "Новинки", link: "/new", isActive: false },
];

beforeEach(() => {
  transactionMock.mockReset();
  deleteManyMock.mockReset();
  createManyMock.mockReset();
  requireAdminSessionMock.mockReset();
  deleteManyMock.mockReturnValue("DELETE_OP");
  createManyMock.mockReturnValue("CREATE_OP");
  transactionMock.mockResolvedValue([]);
});

describe("PUT /api/banners", () => {
  it("возвращает 401 без сессии, не трогая БД", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });

    const { PUT } = await import("@/app/api/banners/route");
    const response = await PUT(putRequest(validList));

    expect(response.status).toBe(401);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("возвращает 403 для роли без прав", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 403 });

    const { PUT } = await import("@/app/api/banners/route");
    const response = await PUT(putRequest(validList));

    expect(response.status).toBe(403);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("возвращает 400 при невалидном массиве", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { PUT } = await import("@/app/api/banners/route");
    const response = await PUT(putRequest([{ imageUrl: "", title: "", link: "#menu", isActive: true }]));

    expect(response.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("заменяет список в $transaction (deleteMany + createMany с sortOrder) и отдаёт 200", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { PUT } = await import("@/app/api/banners/route");
    const response = await PUT(putRequest(validList));

    expect(response.status).toBe(200);
    expect(transactionMock).toHaveBeenCalledWith(["DELETE_OP", "CREATE_OP"]);
    expect(deleteManyMock).toHaveBeenCalledWith({});
    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        { imageUrl: "", title: "Акция", link: "#menu", isActive: true, sortOrder: 0 },
        { imageUrl: "https://x/y.jpg", title: "Новинки", link: "/new", isActive: false, sortOrder: 1 },
      ],
    });
  });

  it("принимает пустой массив (все баннеры удалены)", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { PUT } = await import("@/app/api/banners/route");
    const response = await PUT(putRequest([]));

    expect(response.status).toBe(200);
    expect(createManyMock).toHaveBeenCalledWith({ data: [] });
  });

  it("возвращает 500, если транзакция падает", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    transactionMock.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { PUT } = await import("@/app/api/banners/route");
    const response = await PUT(putRequest(validList));

    expect(response.status).toBe(500);
  });
});
