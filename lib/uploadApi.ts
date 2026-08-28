import { MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/validations/upload";

// Клиентский helper загрузки фото товара из ProductForm (docs/plan.md, пункт 34).
// Отправляет файл на POST /api/uploads (там — сессия ADMIN, валидация, вызов
// Cloudinary), получает готовый URL. Тот же приём, что submitOrder() в lib/orders.ts.
export type UploadProductImageResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function uploadProductImage(file: File): Promise<UploadProductImageResult> {
  // Мгновенная проверка на клиенте — не гоняем заведомо негодный файл на сервер.
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: "Допустимы только JPEG, PNG, WebP или AVIF" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Файл больше 4 МБ" };
  }

  const form = new FormData();
  form.append("file", file);

  try {
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    const data = (await response.json().catch(() => null)) as
      | { url?: string; error?: string }
      | null;

    if (!response.ok || !data?.url) {
      return { ok: false, error: data?.error ?? "Не удалось загрузить изображение" };
    }
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, error: "Нет связи с сервером. Попробуйте ещё раз." };
  }
}
