import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { uploadImage } from "@/lib/storage";
import { validateImageFile } from "@/lib/validations/upload";

// POST /api/uploads — загрузка фото товара в Cloudinary, только ADMIN
// (docs/plan.md, пункт 34; docs/architecture.md, раздел 6). Клиентский ProductForm
// шлёт сюда multipart/form-data с полем `file`; сервер проверяет сессию, тип и
// размер файла, затем отдаёт его в Cloudinary через lib/storage.ts и возвращает
// { url }. Запись URL в товар остаётся за PATCH /api/products/[id].
export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ожидается multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  const invalid = validateImageFile(file);
  if (invalid) {
    // 413 — файл слишком большой; остальное (нет файла / неверный тип) — 400.
    return NextResponse.json({ error: invalid.message }, { status: invalid.code === "size" ? 413 : 400 });
  }

  const result = await uploadImage(file as File);
  if (!result.ok) {
    // Проблема на стороне Cloudinary/сети, а не в запросе клиента.
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ url: result.url });
}
