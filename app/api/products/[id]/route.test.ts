import { beforeEach, describe, expect, it, vi } from "vitest";

const getProductByIdMock = vi.hoisted(() => vi.fn());
const updateProductMock = vi.hoisted(() => vi.fn());
const deleteProductMock = vi.hoisted(() => vi.fn());
const requireAdminSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/productCatalog", () => ({
  getProductById: getProductByIdMock,
  updateProduct: updateProductMock,
  deleteProduct: deleteProductMock,
}));

vi.mock("@/lib/auth", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getProductByIdMock.mockReset();
  updateProductMock.mockReset();
  deleteProductMock.mockReset();
  requireAdminSessionMock.mockReset();
});

describe("GET /api/products/[id]", () => {
  it("возвращает 200 и товар, если он найден", async () => {
    const product = { id: 1, name: "Эспрессо" };
    getProductByIdMock.mockResolvedValueOnce(product);

    const { GET } = await import("@/app/api/products/[id]/route");
    const response = await GET(new Request("http://localhost/api/products/1"), makeParams("1"));

    expect(getProductByIdMock).toHaveBeenCalledWith(1);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(product);
  });

  it("возвращает 404, если товар не найден", async () => {
    getProductByIdMock.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/products/[id]/route");
    const response = await GET(new Request("http://localhost/api/products/999999"), makeParams("999999"));

    expect(response.status).toBe(404);
  });

  it("возвращает 400 при нечисловом id", async () => {
    const { GET } = await import("@/app/api/products/[id]/route");
    const response = await GET(new Request("http://localhost/api/products/abc"), makeParams("abc"));

    expect(response.status).toBe(400);
    expect(getProductByIdMock).not.toHaveBeenCalled();
  });

  it("возвращает 500, если запрос к БД падает", async () => {
    getProductByIdMock.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { GET } = await import("@/app/api/products/[id]/route");
    const response = await GET(new Request("http://localhost/api/products/1"), makeParams("1"));

    expect(response.status).toBe(500);
  });
});

describe("PATCH /api/products/[id]", () => {
  it("возвращает 401 без сессии, не вызывая updateProduct", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });

    const { PATCH } = await import("@/app/api/products/[id]/route");
    const response = await PATCH(patchRequest("1", { name: "Новое имя" }), makeParams("1"));

    expect(response.status).toBe(401);
    expect(updateProductMock).not.toHaveBeenCalled();
  });

  it("возвращает 400 при нечисловом id (после проверки сессии)", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { PATCH } = await import("@/app/api/products/[id]/route");
    const response = await PATCH(patchRequest("abc", { name: "Новое имя" }), makeParams("abc"));

    expect(response.status).toBe(400);
    expect(updateProductMock).not.toHaveBeenCalled();
  });

  it("возвращает 200 и обновлённый товар для ADMIN с валидным телом", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    const product = { id: 1, name: "Новое имя" };
    updateProductMock.mockResolvedValueOnce({ ok: true, product });

    const { PATCH } = await import("@/app/api/products/[id]/route");
    const response = await PATCH(patchRequest("1", { name: "Новое имя" }), makeParams("1"));

    expect(updateProductMock).toHaveBeenCalledWith(1, { name: "Новое имя" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(product);
  });

  it("возвращает 404, если updateProduct сообщает, что товар не найден", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    updateProductMock.mockResolvedValueOnce({ ok: false, error: "Товар не найден" });

    const { PATCH } = await import("@/app/api/products/[id]/route");
    const response = await PATCH(patchRequest("999999", { name: "Новое имя" }), makeParams("999999"));

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/products/[id]", () => {
  it("возвращает 401 без сессии, не вызывая deleteProduct", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });

    const { DELETE } = await import("@/app/api/products/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/products/1"), makeParams("1"));

    expect(response.status).toBe(401);
    expect(deleteProductMock).not.toHaveBeenCalled();
  });

  it("возвращает 204 при успешном удалении", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    deleteProductMock.mockResolvedValueOnce({ ok: true });

    const { DELETE } = await import("@/app/api/products/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/products/1"), makeParams("1"));

    expect(response.status).toBe(204);
  });

  it("возвращает 404, если товар не найден", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    deleteProductMock.mockResolvedValueOnce({ ok: false, error: "Товар не найден" });

    const { DELETE } = await import("@/app/api/products/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/products/999999"), makeParams("999999"));

    expect(response.status).toBe(404);
  });

  it("возвращает 409, если удалению мешает внешний ключ", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    deleteProductMock.mockResolvedValueOnce({
      ok: false,
      error: "Нельзя удалить товар: на него ссылаются существующие заказы или отзывы",
    });

    const { DELETE } = await import("@/app/api/products/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/products/1"), makeParams("1"));

    expect(response.status).toBe(409);
  });
});
