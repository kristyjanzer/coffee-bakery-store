import { beforeEach, describe, expect, it, vi } from "vitest";

const getProductByIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/productCatalog", () => ({
  getProductById: getProductByIdMock,
}));

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  getProductByIdMock.mockReset();
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
