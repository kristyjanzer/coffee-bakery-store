// Загрузка изображений товаров в Cloudinary (docs/plan.md, пункт 34;
// docs/architecture.md, раздел 6). Вызывается только из POST /api/uploads —
// граница интеграции, как lib/telegram.ts: сторонний API дёргается из lib/*
// внутри роут-хендлера, конфиг — только process.env на сервере, никогда
// не уходит в клиентский бандл (unsigned-пресет не секрет, но правило проекта —
// не звать сторонние API из клиента).

const CLOUDINARY_API = "https://api.cloudinary.com/v1_1";

// Cloudinary иногда отвечает не мгновенно; загрузка идёт в фоне формы товара,
// но совсем без предела ждать не стоит.
const UPLOAD_TIMEOUT_MS = 20000;

export type UploadImageResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

interface CloudinaryUploadResponse {
  secure_url?: string;
  error?: { message?: string };
}

// Отдаём файл в Cloudinary через unsigned upload preset. Проверку типа/размера
// файла и сессии делает вызывающий роут (app/api/uploads/route.ts) — здесь только
// сам вызов API и разбор ответа.
export async function uploadImage(file: File): Promise<UploadImageResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    console.error("uploadImage: CLOUDINARY_CLOUD_NAME/CLOUDINARY_UPLOAD_PRESET не заданы");
    return { ok: false, error: "Загрузка изображений не настроена" };
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);

  try {
    const response = await fetch(`${CLOUDINARY_API}/${cloudName}/image/upload`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });

    const data = (await response.json().catch(() => null)) as CloudinaryUploadResponse | null;

    if (!response.ok || !data?.secure_url) {
      const detail = data?.error?.message ?? `HTTP ${response.status}`;
      console.error(`uploadImage: Cloudinary ответил — ${detail}`);
      return { ok: false, error: "Не удалось загрузить изображение" };
    }

    return { ok: true, url: data.secure_url };
  } catch (error) {
    console.error("uploadImage:", error);
    return { ok: false, error: "Не удалось загрузить изображение" };
  }
}
