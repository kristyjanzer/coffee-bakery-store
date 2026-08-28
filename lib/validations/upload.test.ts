import { describe, expect, it } from "vitest";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validations/upload";

function fakeFile(type: string, size: number): File {
  return new File([new Uint8Array(size)], "photo", { type });
}

describe("validateImageFile", () => {
  it("пропускает валидный JPEG нужного размера", () => {
    expect(validateImageFile(fakeFile("image/jpeg", 1024))).toBeNull();
  });

  it("отклоняет отсутствие файла", () => {
    expect(validateImageFile(null)?.code).toBe("missing");
    expect(validateImageFile("not a file")?.code).toBe("missing");
    expect(validateImageFile(fakeFile("image/png", 0))?.code).toBe("missing");
  });

  it("отклоняет неразрешённый тип", () => {
    expect(validateImageFile(fakeFile("application/pdf", 1024))?.code).toBe("type");
    expect(validateImageFile(fakeFile("image/gif", 1024))?.code).toBe("type");
  });

  it("отклоняет файл больше лимита", () => {
    expect(validateImageFile(fakeFile("image/webp", MAX_IMAGE_BYTES + 1))?.code).toBe("size");
  });
});
