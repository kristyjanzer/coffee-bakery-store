"use client";

import { useState } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useCartStore, selectTotalPrice } from "@/stores/cartStore";
import { getProductById } from "@/lib/menu";
import { formatPrice } from "@/lib/utils";
import { submitOrder } from "@/lib/orders";
import type { OrderFormValues } from "@/lib/validations/order";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { QtyStepper } from "@/components/catalog/QtyStepper";
import { CheckoutForm } from "@/components/cart/CheckoutForm";

type WidgetStep = "cart" | "checkout" | "success";

const STEP_TITLES: Record<WidgetStep, string> = {
  cart: "Корзина",
  checkout: "Оформление заказа",
  success: "Заявка принята",
};

// Открывается по клику на CartIcon (isWidgetOpen в cartStore). Список позиций +
// итоговая стоимость (docs/plan.md, пункт 10). QtyStepper переиспользуется как есть
// (docs/architecture.md, раздел 5 — общий для карточки товара, страницы товара и виджета
// корзины); max берём из lib/menu.ts по productId, так как CartItem остаток не хранит.
//
// Шаг "checkout"/"success" (docs/plan.md, пункт 12) — та же модалка переключается на форму
// заявки без орехов/оплаты. submitOrder() пока заглушка (backend появится в пункте 28) —
// step хранится локально, а не в cartStore, потому что это чисто UI-состояние виджета.
export function CartWidget() {
  const isOpen = useCartStore((state) => state.isWidgetOpen);
  const closeWidget = useCartStore((state) => state.closeWidget);
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const totalPrice = useCartStore(selectTotalPrice);

  const [step, setStep] = useState<WidgetStep>("cart");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    closeWidget();
    setStep("cart");
  }

  async function handleCheckoutSubmit(values: OrderFormValues) {
    setIsSubmitting(true);
    await submitOrder({ form: values, items, totalPrice });
    setIsSubmitting(false);
    clearCart();
    setStep("success");
  }

  if (step === "checkout") {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        onBack={() => setStep("cart")}
        title={STEP_TITLES.checkout}
      >
        <CheckoutForm
          items={items}
          totalPrice={totalPrice}
          onSubmit={handleCheckoutSubmit}
          isSubmitting={isSubmitting}
        />
      </Modal>
    );
  }

  if (step === "success") {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={STEP_TITLES.success}>
        <p className="font-venuscom text-body-sm text-black-olive">
          Спасибо! Мы получили вашу заявку и скоро свяжемся с вами, чтобы подтвердить заказ.
        </p>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={STEP_TITLES.cart}>
      {items.length === 0 ? (
        <p className="font-venuscom text-body-sm text-black-olive/60">Корзина пуста</p>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {items.map((item) => {
              const product = getProductById(item.productId);
              return (
                <li
                  key={item.productId}
                  className="flex items-end gap-3 border-b border-sage-mist pb-4 last:border-none last:pb-0"
                >
                  {/* Фото — 4rem (64px), как на референсе пользователя; без скругления
                      (radius-cards: 0 из DESIGN.md, как у ProductCard). */}
                  {item.imageUrl ? (
                    <div className="relative size-16 shrink-0">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center bg-sage-mist/30">
                      <FontAwesomeIcon icon={faImage} className="size-8 text-black-olive/20" />
                    </div>
                  )}

                  {/* items-end на <li> прижимает эту колонку к нижнему краю фото — цена и
                      степпер оказываются на одном уровне с низом фото. */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-venuscom text-body-sm text-black-olive">{item.name}</p>
                      <button
                        type="button"
                        aria-label={`Убрать «${item.name}» из корзины`}
                        onClick={() => removeItem(item.productId)}
                        className="shrink-0 text-black-olive/40 hover:text-black-olive"
                      >
                        <FontAwesomeIcon icon={faTrash} className="size-4" />
                      </button>
                    </div>
                    {item.unit && (
                      <p className="mt-1 font-venuscom text-caption text-black-olive/60">
                        {item.unit}
                      </p>
                    )}

                    {/* Цена — badge на bg-sage-mist/30 (тот же приём, что счётчик на CartIcon,
                        только нейтральный тон вместо акцентного lemon-zest) + степпер справа. */}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="rounded-sm bg-sage-mist/30 px-3 py-1.5 font-venuscom text-caption font-semibold text-black-olive">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                      <QtyStepper
                        productId={item.productId}
                        name={item.name}
                        price={item.price}
                        imageUrl={item.imageUrl}
                        unit={item.unit}
                        max={product ? product.stockQuantity : 0}
                        preventRemoveAtOne
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t border-sage-mist pt-4">
            <span className="font-venuscom text-body-lg font-semibold text-forest-ink">
              Итого
            </span>
            <span className="font-venuscom text-body-lg font-semibold text-black-olive">
              {formatPrice(totalPrice)}
            </span>
          </div>

          <Button
            type="button"
            onClick={() => setStep("checkout")}
            className="mt-4 w-full"
          >
            Оформить заказ
          </Button>
        </>
      )}
    </Modal>
  );
}
