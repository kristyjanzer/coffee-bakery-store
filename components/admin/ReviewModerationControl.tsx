"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { moderateReview } from "@/lib/api-client/reviewAdminApi";
import { uploadProductImage } from "@/lib/api-client/uploadApi";

interface ReviewModerationControlProps {
  reviewId: number;
  initialIsApproved: boolean;
  initialShopReply: string | null;
  initialImageUrl: string | null;
}

// Модерация отзыва + ответ от магазина + фото для слайдера на главной
// (docs/plan.md, пункты 19/35). Пишет через PATCH /api/reviews/[id]
// (lib/reviewAdminApi). Все поля сохраняются одной кнопкой (в отличие от
// OrderStatusControl, где единственное поле применяется сразу на onChange).
// После успеха router.refresh() перечитывает Server Component страницы.
export function ReviewModerationControl({
  reviewId,
  initialIsApproved,
  initialShopReply,
  initialImageUrl,
}: ReviewModerationControlProps) {
  const router = useRouter();
  const [isApproved, setIsApproved] = useState(initialIsApproved);
  const [shopReply, setShopReply] = useState(initialShopReply ?? "");
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загрузка фото — переиспользуем helper формы товара (Cloudinary через
  // POST /api/uploads, сессия ADMIN проверяется на сервере). Тот же приём, что в
  // components/admin/ProductForm.tsx.
  async function handleImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // сбрасываем value, чтобы повторный выбор того же файла снова сработал
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    const result = await uploadProductImage(file);
    setIsUploading(false);

    if (result.ok) {
      setImageUrl(result.url);
      setSavedAt(null);
    } else {
      setUploadError(result.error);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitModeration();
  }

  async function submitModeration() {
    setIsSaving(true);
    setSavedAt(null);
    setError(null);
    const result = await moderateReview(reviewId, {
      isApproved,
      shopReply: shopReply.trim() || null,
      // Пустое поле → null: слайдер на главной покажет фото связанного товара.
      imageUrl: imageUrl.trim() || null,
    });
    setIsSaving(false);
    if (result.ok) {
      setSavedAt(Date.now());
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <p className="font-venuscom text-caption text-black-olive/60">Статус модерации</p>
        <div className="mt-1 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setIsApproved(true);
              setSavedAt(null);
            }}
            className={
              isApproved
                ? "rounded-sm border border-forest-ink px-4 py-2 font-venuscom text-body-sm uppercase text-forest-ink"
                : "rounded-sm border border-sage-mist px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive/60 hover:text-black-olive"
            }
          >
            Одобрен
          </button>
          <button
            type="button"
            onClick={() => {
              setIsApproved(false);
              setSavedAt(null);
            }}
            className={
              !isApproved
                ? "rounded-sm border border-red-500 px-4 py-2 font-venuscom text-body-sm uppercase text-red-600"
                : "rounded-sm border border-sage-mist px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive/60 hover:text-black-olive"
            }
          >
            На модерации
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="shopReply" className="font-venuscom text-caption text-black-olive/60">
          Ответ от магазина
        </label>
        <textarea
          id="shopReply"
          value={shopReply}
          onChange={(event) => {
            setShopReply(event.target.value);
            setSavedAt(null);
          }}
          placeholder="Например: спасибо за отзыв, будем рады видеть вас снова!"
          rows={3}
          className="mt-1 w-full rounded-sm border border-sage-mist bg-warm-cream px-4 py-3 font-venuscom text-body-sm text-black-olive placeholder:text-black-olive/50 focus:border-lemon-zest focus:outline-none"
        />
      </div>

      <div>
        <p className="font-venuscom text-caption text-black-olive/60">Фото отзыва (для слайдера на главной)</p>

        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* Превью: загруженное/вставленное фото или плашка-заглушка */}
          <div className="relative size-24 shrink-0 overflow-hidden border border-sage-mist bg-sage-mist/20">
            {imageUrl ? (
              <Image src={imageUrl} alt="" fill sizes="96px" className="object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center font-venuscom text-caption text-black-olive/40">
                нет фото
              </span>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(event) => void handleImageFile(event)}
              className="hidden"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? "Загружаем…" : imageUrl ? "Заменить фото" : "Загрузить фото"}
              </Button>
              {imageUrl && !isUploading && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl("");
                    setSavedAt(null);
                  }}
                  className="font-venuscom text-caption text-red-600 hover:underline"
                >
                  Убрать
                </button>
              )}
            </div>

            {/* URL можно вставить и вручную (напр. фото уже лежит в Cloudinary) */}
            <input
              value={imageUrl}
              onChange={(event) => {
                setImageUrl(event.target.value);
                setSavedAt(null);
              }}
              placeholder="или вставьте ссылку: https://res.cloudinary.com/..."
              className="w-full rounded-sm border border-sage-mist bg-warm-cream px-4 py-3 font-venuscom text-body-sm text-black-olive placeholder:text-black-olive/50 focus:border-lemon-zest focus:outline-none"
            />
            {uploadError && (
              <p className="font-venuscom text-caption font-semibold text-red-600">{uploadError}</p>
            )}
            <p className="font-venuscom text-caption text-black-olive/50">
              JPEG, PNG, WebP или AVIF, до 4 МБ. Если убрать — слайдер покажет фото товара.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSaving || isUploading}>
          {isSaving ? "Сохраняем…" : "Сохранить"}
        </Button>
        {!isSaving && savedAt && !error && (
          <p className="font-venuscom text-caption text-forest-ink">Сохранено</p>
        )}
        {error && <p className="font-venuscom text-caption font-semibold text-red-600">{error}</p>}
      </div>
    </form>
  );
}
