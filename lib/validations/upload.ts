// Ограничения на загружаемое изображение товара (docs/plan.md, пункт 34).
// Дублируют/сужают правила unsigned-пресета Cloudinary: пресет публичный, поэтому
// сервер проверяет файл сам, до обращения к Cloudinary.

// Держим ниже лимита тела serverless-функции Vercel (~4.5 МБ) — файл проходит
// через наш роут, а не грузится напрямую в Cloudinary.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type ImageValidationError =
  | { code: "missing"; message: string }
  | { code: "type"; message: string }
  | { code: "size"; message: string };

// Утиная проверка на «это загруженный файл»: request.formData() отдаёт для файловых
// полей объект Web File, а для текстовых — строку. instanceof File здесь ненадёжен —
// разные реалмы (undici в рантайме, jsdom в тестах) дают разные конструкторы.
function isUploadedFile(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).name === "string" &&
    typeof (value as File).type === "string" &&
    typeof (value as File).size === "number"
  );
}

// Возвращает ошибку или null, если файл проходит. Отдельная функция — чтобы
// покрыть логику юнит-тестом без поднятия роута.
export function validateImageFile(file: unknown): ImageValidationError | null {
  if (!isUploadedFile(file) || file.size === 0) {
    return { code: "missing", message: "Файл не передан" };
  }
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { code: "type", message: "Допустимы только JPEG, PNG, WebP или AVIF" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { code: "size", message: "Файл больше 4 МБ" };
  }
  return null;
}
