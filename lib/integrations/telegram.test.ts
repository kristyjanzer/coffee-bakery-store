import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const findUniqueMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { order: { findUnique: findUniqueMock, update: updateMock } },
}));

const sampleOrder = {
  id: 42,
  customerName: "Анна Смирнова",
  customerContact: "+7 900 123-45-01",
  customerEmail: "anna@example.com",
  comment: "Без сахара",
  preferredDate: null,
  totalAmount: 400,
  items: [{ productNameSnapshot: "Двойной эспрессо", priceSnapshot: 200, quantity: 2 }],
};

beforeEach(() => {
  findUniqueMock.mockReset();
  updateMock.mockReset();
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
  vi.stubEnv("TELEGRAM_CHAT_ID", "12345");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("notifyNewOrder", () => {
  it("не ходит в сеть и в БД, если токен/чат не заданы", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { notifyNewOrder } = await import("@/lib/integrations/telegram");
    await notifyNewOrder(42);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("отправляет сообщение и проставляет telegramNotifiedAt при успехе", async () => {
    findUniqueMock.mockResolvedValueOnce(sampleOrder);
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { notifyNewOrder } = await import("@/lib/integrations/telegram");
    await notifyNewOrder(42);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bottest-token/sendMessage");
    const body = JSON.parse(init.body as string);
    expect(body.chat_id).toBe("12345");
    expect(body.text).toContain("Новая заявка №42");
    expect(body.text).toContain("Двойной эспрессо × 2 — 400 ₽");
    expect(body.text).toContain("Итого: 400 ₽");
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { telegramNotifiedAt: expect.any(Date) },
    });
  });

  it("не падает и не ставит отметку, если Telegram ответил не-2xx", async () => {
    findUniqueMock.mockResolvedValueOnce(sampleOrder);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 400, text: async () => "bad request" })
    );

    const { notifyNewOrder } = await import("@/lib/integrations/telegram");
    await expect(notifyNewOrder(42)).resolves.toBeUndefined();

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("не пробрасывает ошибку сети/таймаута", async () => {
    findUniqueMock.mockResolvedValueOnce(sampleOrder);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network down")));

    const { notifyNewOrder } = await import("@/lib/integrations/telegram");
    await expect(notifyNewOrder(42)).resolves.toBeUndefined();

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("пропускает, если заказ не найден", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { notifyNewOrder } = await import("@/lib/integrations/telegram");
    await notifyNewOrder(999);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
