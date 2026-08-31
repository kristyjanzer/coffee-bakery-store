import { describe, expect, it, vi, beforeEach } from "vitest";
import { MAX_IMAGE_BYTES } from "@/lib/validations/upload";

const requireAdminSessionMock = vi.hoisted(() => vi.fn());
const uploadImageMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/auth", () => ({ requireAdminSession: requireAdminSessionMock }));
vi.mock("@/lib/integrations/storage", () => ({ uploadImage: uploadImageMock }));

beforeEach(() => {
  requireAdminSessionMock.mockReset();
  uploadImageMock.mockReset();
});

// Отдаём объект с formData() напрямую — round-trip настоящего Request с FormData-телом
// в jsdom-окружении Vitest не сохраняет размер файла. Роут читает только request.formData().
function uploadRequest(file?: File): Request {
  const form = new FormData();
  if (file) form.append("file", file);
  return { formData: async () => form } as unknown as Request;
}

function fakeFile(type = "image/jpeg", size = 1024): File {
  return new File([new Uint8Array(size)], "photo", { type });
}

describe("POST /api/uploads", () => {
  it("401 без сессии, не трогая Cloudinary", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });

    const { POST } = await import("@/app/api/uploads/route");
    const response = await POST(uploadRequest(fakeFile()));

    expect(response.status).toBe(401);
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("403 для роли без прав", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 403 });

    const { POST } = await import("@/app/api/uploads/route");
    expect((await POST(uploadRequest(fakeFile()))).status).toBe(403);
  });

  it("400, если файл не передан", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { POST } = await import("@/app/api/uploads/route");
    const response = await POST(uploadRequest());

    expect(response.status).toBe(400);
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("400 для неразрешённого типа", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { POST } = await import("@/app/api/uploads/route");
    expect((await POST(uploadRequest(fakeFile("application/pdf")))).status).toBe(400);
  });

  it("413 для файла больше лимита", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });

    const { POST } = await import("@/app/api/uploads/route");
    const response = await POST(uploadRequest(fakeFile("image/png", MAX_IMAGE_BYTES + 1)));

    expect(response.status).toBe(413);
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("200 и { url } при успешной загрузке", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    uploadImageMock.mockResolvedValueOnce({ ok: true, url: "https://res.cloudinary.com/x/y.jpg" });

    const { POST } = await import("@/app/api/uploads/route");
    const response = await POST(uploadRequest(fakeFile()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://res.cloudinary.com/x/y.jpg" });
  });

  it("502, если Cloudinary/сеть подвели", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    uploadImageMock.mockResolvedValueOnce({ ok: false, error: "Не удалось загрузить изображение" });

    const { POST } = await import("@/app/api/uploads/route");
    expect((await POST(uploadRequest(fakeFile()))).status).toBe(502);
  });
});
