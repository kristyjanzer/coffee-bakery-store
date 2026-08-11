"use client";

import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useCartStore, selectTotalPrice } from "@/stores/cartStore";
import { getProductById } from "@/lib/menu";
import { formatPrice } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { QtyStepper } from "@/components/catalog/QtyStepper";

// Открывается по клику на CartIcon (isWidgetOpen в cartStore). Список позиций +
// итоговая стоимость (docs/plan.md, пункт 10). QtyStepper переиспользуется как есть
// (docs/architecture.md, раздел 5 — общий для карточки товара, страницы товара и виджета
// корзины); max берём из lib/menu.ts по productId, так как CartItem остаток не хранит.
export function CartWidget() {
  const isOpen = useCartStore((state) => state.isWidgetOpen);
  const closeWidget = useCartStore((state) => state.closeWidget);
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const totalPrice = useCartStore(selectTotalPrice);

  return (
    <Modal isOpen={isOpen} onClose={closeWidget} title="Корзина">
      {items.length === 0 ? (
        <p className="font-venuscom text-body-sm text-black-olive/60">Корзина пуста</p>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li
                key={item.productId}
                className="flex items-center gap-3 border-b border-sage-mist pb-4 last:border-none last:pb-0"
              >
                {item.imageUrl ? (
                  <div className="relative h-14 w-14 shrink-0">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-sage-mist/30">
                    <FontAwesomeIcon icon={faImage} className="h-5 w-5 text-black-olive/20" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-venuscom text-body-sm text-black-olive">
                    {item.name}
                  </p>
                  {item.unit && (
                    <p className="font-venuscom text-caption text-black-olive/60">{item.unit}</p>
                  )}
                  <p className="mt-1 font-venuscom text-caption font-semibold text-black-olive">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>

                <QtyStepper
                  productId={item.productId}
                  name={item.name}
                  price={item.price}
                  imageUrl={item.imageUrl}
                  unit={item.unit}
                  max={getProductById(item.productId)?.stockQuantity ?? 0}
                />

                <button
                  type="button"
                  aria-label={`Убрать «${item.name}» из корзины`}
                  onClick={() => removeItem(item.productId)}
                  className="text-black-olive/50 hover:text-black-olive"
                >
                  <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t border-sage-mist pt-4">
            <span className="font-venuscom text-body-lg font-semibold text-forest-ink">
              Итого
            </span>
            <span className="font-venuscom text-body-lg font-semibold text-black-olive">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </>
      )}
    </Modal>
  );
}
