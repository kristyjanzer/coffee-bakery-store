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
      <Modal isOpen={isOpen} onClose={handleClose} title={STEP_TITLES.checkout}>
        <CheckoutForm
          items={items}
          totalPrice={totalPrice}
          onBack={() => setStep("cart")}
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
                  className="flex flex-col gap-3 border-b border-sage-mist pb-4 last:border-none last:pb-0 sm:flex-row sm:items-center"
                >
                  {/* На мобильных фото — сверху и во всю ширину (было 56px, имя терялось
                      за truncate); на sm+ возвращается компактная миниатюра как раньше. */}
                  {item.imageUrl ? (
                    <div className="relative h-40 w-full shrink-0 sm:size-14">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="(min-width: 640px) 56px, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-40 w-full shrink-0 items-center justify-center bg-sage-mist/30 sm:size-14">
                      <FontAwesomeIcon icon={faImage} className="size-8 text-black-olive/20 sm:size-5" />
                    </div>
                  )}

                  {/* На sm+ становится display:contents — text-блок и controls выходят
                      прямыми флекс-детьми <li>, воссоздавая прежнюю горизонтальную раскладку. */}
                  <div className="flex items-center justify-between gap-3 sm:contents">
                    <div className="min-w-0 flex-1">
                      <p className="font-venuscom text-body-sm text-black-olive sm:truncate">
                        {item.name}
                      </p>
                      {item.unit && (
                        <p className="font-venuscom text-caption text-black-olive/60">
                          {item.unit}
                        </p>
                      )}
                      <p className="mt-1 font-venuscom text-caption font-semibold text-black-olive">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <QtyStepper
                        productId={item.productId}
                        name={item.name}
                        price={item.price}
                        imageUrl={item.imageUrl}
                        unit={item.unit}
                        max={product ? product.stockQuantity : 0}
                        preventRemoveAtOne
                      />

                      <button
                        type="button"
                        aria-label={`Убрать «${item.name}» из корзины`}
                        onClick={() => removeItem(item.productId)}
                        className="text-black-olive/50 hover:text-black-olive"
                      >
                        <FontAwesomeIcon icon={faTrash} className="size-4" />
                      </button>
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
