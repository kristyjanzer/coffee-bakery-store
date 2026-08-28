import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";

function fakeFile(): File {
  return new File([new Uint8Array(16)], "photo.jpg", { type: "image/jpeg" });
}

describe("uploadImage", () => {
  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
    process.env.CLOUDINARY_UPLOAD_PRESET = "test-preset";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_UPLOAD_PRESET;
  });

  it("шлёт файл и upload_preset на endpoint нужного cloud name, возвращает secure_url", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ secure_url: "https://res.cloudinary.com/test-cloud/x.jpg" }) });
    vi.stubGlobal("fetch", fetchMock);

    const { uploadImage } = await import("@/lib/storage");
    const result = await uploadImage(fakeFile());

    expect(result).toEqual({ ok: true, url: "https://res.cloudinary.com/test-cloud/x.jpg" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.cloudinary.com/v1_1/test-cloud/image/upload");
    expect(init.method).toBe("POST");
    const body = init.body as FormData;
    expect(body.get("upload_preset")).toBe("test-preset");
    expect(body.get("file")).toBeInstanceOf(File);
  });

  it("возвращает ok:false, если конфиг Cloudinary не задан", async () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { uploadImage } = await import("@/lib/storage");
    const result = await uploadImage(fakeFile());

    expect(result.ok).toBe(false);
  });

  it("возвращает ok:false при не-2xx от Cloudinary, не пробрасывая детали", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { message: "Invalid preset" } }) })
    );
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { uploadImage } = await import("@/lib/storage");
    const result = await uploadImage(fakeFile());

    expect(result).toEqual({ ok: false, error: "Не удалось загрузить изображение" });
  });

  it("возвращает ok:false при обрыве сети", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network")));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const { uploadImage } = await import("@/lib/storage");
    expect((await uploadImage(fakeFile())).ok).toBe(false);
  });
});
