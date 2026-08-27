"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orderStatus";
import { updateOrderStatus } from "@/lib/orderAdminApi";

interface OrderStatusControlProps {
  orderId: number;
  initialStatus: OrderStatus;
}

// Смена статуса заказа (docs/plan.md, пункты 16/29/35). Пишет через PATCH
// /api/orders/[id] (lib/orderAdminApi) — статус применяется сразу на onChange
// (единственное поле). На ошибке select возвращается к прежнему значению и
// показывается текст ошибки; на успехе router.refresh() перечитывает страницу.
export function OrderStatusControl({ orderId, initialStatus }: OrderStatusControlProps) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(nextStatus: OrderStatus) {
    if (nextStatus === status) return;

    const previous = status;
    setStatus(nextStatus);
    setIsSaving(true);
    setSavedAt(null);
    setError(null);

    const result = await updateOrderStatus(orderId, nextStatus);
    setIsSaving(false);

    if (result.ok) {
      setSavedAt(Date.now());
      router.refresh();
    } else {
      setStatus(previous);
      setError(result.error);
    }
  }

  return (
    <div>
      <label htmlFor="order-status" className="block font-venuscom text-caption text-black-olive/60">
        Статус заказа
      </label>
      {/* Селект под лейблом (block), на мобильных — во всю ширину колонки; с sm:
          возвращается к авто-ширине по контенту, как у остальных полей секции. */}
      <div className="relative mt-1 block w-full sm:inline-block sm:w-auto">
        <select
          id="order-status"
          value={status}
          disabled={isSaving}
          onChange={(event) => void handleChange(event.target.value as OrderStatus)}
          className="peer w-full appearance-none rounded-sm border border-sage-mist bg-warm-cream py-3 pl-4 pr-9 font-venuscom text-body-sm text-black-olive focus:border-lemon-zest focus:outline-none disabled:opacity-60 sm:w-auto"
        >
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ORDER_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <FontAwesomeIcon
          icon={faChevronDown}
          className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-black-olive/60 peer-disabled:opacity-60"
        />
      </div>
      {isSaving && (
        <p className="mt-1 font-venuscom text-caption text-black-olive/60">Сохраняем…</p>
      )}
      {!isSaving && savedAt && !error && (
        <p className="mt-1 font-venuscom text-caption text-forest-ink">Статус обновлён</p>
      )}
      {error && (
        <p className="mt-1 font-venuscom text-caption font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
}
