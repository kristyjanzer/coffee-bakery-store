"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { orderFormDefaultValues, orderFormSchema, type OrderFormValues } from "@/lib/validations/order";
import { formatPhoneInput, formatPrice } from "@/lib/utils";
import type { CartItem } from "@/stores/cartStore";

interface CheckoutFormProps {
  items: CartItem[];
  totalPrice: number;
  onSubmit: (values: OrderFormValues) => void | Promise<void>;
  isSubmitting: boolean;
}

type FormErrors = Partial<Record<keyof OrderFormValues, string>>;

// Форма оформления заявки (docs/plan.md, пункт 12): имя, телефон, email (обязателен —
// на него отправляется чек об оплате), комментарий, дата предзаказа. Валидация — тот же
// zod-стек, что и в остальном проекте, без react-hook-form (лишняя зависимость не нужна).
export function CheckoutForm({ items, totalPrice, onSubmit, isSubmitting }: CheckoutFormProps) {
  const [values, setValues] = useState<OrderFormValues>(orderFormDefaultValues);
  const [errors, setErrors] = useState<FormErrors>({});

  function handleChange(field: keyof OrderFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = orderFormSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof OrderFormValues;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    void onSubmit(result.data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <label htmlFor="customerName" className="font-venuscom text-caption text-black-olive/70">
          Имя
        </label>
        <Input
          id="customerName"
          value={values.customerName}
          onChange={(event) => handleChange("customerName", event.target.value)}
          placeholder="Как к вам обращаться"
          className="mt-1"
        />
        {errors.customerName && (
          <p className="mt-1 font-venuscom text-caption font-semibold text-black-olive">
            {errors.customerName}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="customerContact" className="font-venuscom text-caption text-black-olive/70">
          Телефон
        </label>
        <Input
          id="customerContact"
          type="tel"
          inputMode="numeric"
          value={values.customerContact}
          onChange={(event) =>
            handleChange("customerContact", formatPhoneInput(event.target.value))
          }
          placeholder="+7 900 000-00-00"
          className="mt-1"
        />
        {errors.customerContact && (
          <p className="mt-1 font-venuscom text-caption font-semibold text-black-olive">
            {errors.customerContact}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="font-venuscom text-caption text-black-olive/70">
          Email (пришлем чек об оплате)
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => handleChange("email", event.target.value)}
          placeholder="you@example.com"
          className="mt-1"
        />
        {errors.email && (
          <p className="mt-1 font-venuscom text-caption font-semibold text-black-olive">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="preferredDate" className="font-venuscom text-caption text-black-olive/70">
          Дата предзаказа (необязательно)
        </label>
        <Input
          id="preferredDate"
          type="date"
          value={values.preferredDate}
          onChange={(event) => handleChange("preferredDate", event.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <label htmlFor="comment" className="font-venuscom text-caption text-black-olive/70">
          Комментарий (необязательно)
        </label>
        <textarea
          id="comment"
          value={values.comment}
          onChange={(event) => handleChange("comment", event.target.value)}
          placeholder="Например: без орехов, к 18:00"
          rows={3}
          className="mt-1 w-full rounded-sm border border-sage-mist bg-warm-cream px-4 py-3 font-venuscom text-body-sm text-black-olive placeholder:text-black-olive/50 focus:border-lemon-zest focus:outline-none"
        />
      </div>

      <div className="border-t border-sage-mist pt-4">
        <p className="font-venuscom text-caption text-black-olive/70">Ваш заказ</p>
        <ul className="mt-2 flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item.productId}
              className="flex items-center justify-between gap-3 font-venuscom text-body-sm text-black-olive"
            >
              <span className="truncate">
                {item.name} × {item.quantity}
              </span>
              <span className="shrink-0 font-semibold">
                {formatPrice(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-sage-mist pt-3">
          <span className="font-venuscom text-body-sm font-semibold text-forest-ink">Итого</span>
          <span className="font-venuscom text-body-sm font-semibold text-black-olive">
            {formatPrice(totalPrice)}
          </span>
        </div>
      </div>

      <div className="mt-2">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Отправляем…" : "Отправить заявку"}
        </Button>
      </div>
    </form>
  );
}
