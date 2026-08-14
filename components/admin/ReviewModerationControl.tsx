"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { moderateReview } from "@/lib/reviews";

interface ReviewModerationControlProps {
  reviewId: number;
  initialIsApproved: boolean;
  initialShopReply: string | null;
}

// Модерация отзыва + ответ от магазина (docs/plan.md, пункт 19). moderateReview() —
// заглушка (PATCH /api/reviews/[id] появится в пункте 30 плана), ничего не сохраняет
// по-настоящему — статус и ответ живут только в локальном состоянии этого компонента,
// как в OrderStatusControl. Оба поля сохраняются одной кнопкой (в отличие от
// OrderStatusControl, где единственное поле применяется сразу на onChange) — статус и
// текст ответа осмысленны только вместе.
export function ReviewModerationControl({
  reviewId,
  initialIsApproved,
  initialShopReply,
}: ReviewModerationControlProps) {
  const [isApproved, setIsApproved] = useState(initialIsApproved);
  const [shopReply, setShopReply] = useState(initialShopReply ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitModeration();
  }

  async function submitModeration() {
    setIsSaving(true);
    setSavedAt(null);
    await moderateReview(reviewId, { isApproved, shopReply: shopReply.trim() || null });
    setIsSaving(false);
    setSavedAt(Date.now());
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

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Сохраняем…" : "Сохранить"}
        </Button>
        {!isSaving && savedAt && (
          <p className="font-venuscom text-caption text-forest-ink">Сохранено (заглушка)</p>
        )}
      </div>
    </form>
  );
}
