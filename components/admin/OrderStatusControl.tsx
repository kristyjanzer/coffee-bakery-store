"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, updateOrderStatus, type OrderStatus } from "@/lib/orders";

interface OrderStatusControlProps {
  orderId: number;
  initialStatus: OrderStatus;
}

// Изменение статуса заказа (docs/plan.md, пункт 16). updateOrderStatus() — заглушка
// (PATCH /api/orders/[id] появится в пункте 29 плана) и ничего не сохраняет по-настоящему
// — новый статус живёт только в локальном состоянии этого компонента, поэтому обновление
// страницы вернёт заказ к мок-значению из lib/orders.ts. Это тот же принцип, что и у
// LoginForm/CheckoutForm — форма полностью рабочая, персистентность добавится "тихо".
export function OrderStatusControl({ orderId, initialStatus }: OrderStatusControlProps) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function handleChange(nextStatus: OrderStatus) {
    if (nextStatus === status) return;

    setIsSaving(true);
    setSavedAt(null);
    await updateOrderStatus(orderId, nextStatus);
    setStatus(nextStatus);
    setIsSaving(false);
    setSavedAt(Date.now());
  }

  return (
    <div>
      <label htmlFor="order-status" className="font-venuscom text-caption text-black-olive/60">
        Статус заказа
      </label>
      <div className="relative mt-1 inline-block">
        <select
          id="order-status"
          value={status}
          disabled={isSaving}
          onChange={(event) => void handleChange(event.target.value as OrderStatus)}
          className="peer appearance-none rounded-sm border border-sage-mist bg-warm-cream py-2 pl-4 pr-8 font-venuscom text-body-sm text-black-olive focus:border-lemon-zest focus:outline-none disabled:opacity-60"
        >
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ORDER_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <FontAwesomeIcon
          icon={faChevronDown}
          className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-black-olive/60 peer-disabled:opacity-60"
        />
      </div>
      {isSaving && (
        <p className="mt-1 font-venuscom text-caption text-black-olive/60">Сохраняем…</p>
      )}
      {!isSaving && savedAt && (
        <p className="mt-1 font-venuscom text-caption text-forest-ink">Статус обновлён (заглушка)</p>
      )}
    </div>
  );
}
