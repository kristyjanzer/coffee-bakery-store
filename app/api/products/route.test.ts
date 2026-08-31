import { describe, expect, it, vi, beforeEach } from "vitest";

const getProductsMock = vi.hoisted(() => vi.fn());
const createProductMock = vi.hoisted(() => vi.fn());
const requireAdminSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/productCatalog", () => ({
  getProducts: getProductsMock,
  createProduct: createProductMock,
}));

vi.mock("@/lib/auth/auth", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

beforeEach(() => {
  createProductMock.mockReset();
  requireAdminSessionMock.mockReset();
});

const validProductBody = { name: "Эспрессо", categorySlug: "kofe", price: 200 };

function postRequest(body: unknown) {
  return new Request("http://localhost/api/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/products", () => {
  it("возвращает 200 и список товаров из lib/productCatalog", async () => {
    const products = [{ id: 1, name: "Эспрессо" }];
    getProductsMock.mockResolvedValueOnce(products);

    const { GET } = await import("@/app/api/products/route");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(products);
  });

  it("возвращает 500, если запрос к БД падает", async () => {
    getProductsMock.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { GET } = await import("@/app/api/products/route");
    const response = await GET();

    expect(response.status).toBe(500);
  });
});

describe("POST /api/products", () => {
  it("возвращает 401 без сессии, не вызывая createProduct", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });

    const { POST } = await import("@/app/api/products/route");
    const response = await POST(postRequest(validProductBody));

    expect(response.status).toBe(401);
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("возвращает 403 для роли без прав", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 403 });

    const { POST } = await import("@/app/api/products/route");
    const response = await POST(postRequest(validProductBody));

    expect(response.status).toBe(403);
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("возвращает 201 и созданный товар для ADMIN с валидным телом", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    const product = { id: 1, ...validProductBody };
    createProductMock.mockResolvedValueOnce({ ok: true, product });

    const { POST } = await import("@/app/api/products/route");
    const response = await POST(postRequest(validProductBody));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(product);
  });

  it("возвращает 400, если тело не проходит валидацию", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { POST } = await import("@/app/api/products/route");
    const response = await POST(postRequest({ ...validProductBody, name: "" }));

    expect(response.status).toBe(400);
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("возвращает 400, если createProduct сообщает об ошибке (например, категория не найдена)", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    createProductMock.mockResolvedValueOnce({ ok: false, error: 'Категория "no-such" не найдена' });

    const { POST } = await import("@/app/api/products/route");
    const response = await POST(postRequest(validProductBody));

    expect(response.status).toBe(400);
  });
});
