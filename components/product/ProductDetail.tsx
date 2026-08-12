import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage } from "@fortawesome/free-solid-svg-icons";
import { formatPrice } from "@/lib/utils";
import type { MenuProduct } from "@/lib/menu";
import { QtyStepper } from "@/components/catalog/QtyStepper";

interface ProductDetailProps {
  product: MenuProduct;
}

// Состав и БЖУ появятся вместе с Prisma-моделью Product (docs/architecture.md, раздел 3,
// поля composition/protein/fat/carbs) — в текущем источнике данных (menu.json) их нет,
// показываем только реально существующие поля.
export function ProductDetail({ product }: ProductDetailProps) {
  const weightLabel = product.volumeMl
    ? `${product.volumeMl} мл`
    : product.weightG
      ? `${product.weightG} г`
      : null;

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-[60px]">
      {product.imageUrl ? (
        <div className="relative aspect-square w-full">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-sage-mist/30">
          <FontAwesomeIcon icon={faImage} className="size-16 text-black-olive/20" />
        </div>
      )}

      <div className="flex flex-col">
        <h1 className="font-venuscom text-heading uppercase tracking-[0.03em] text-black-olive">
          {product.name}
        </h1>

        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
          {weightLabel && (
            <div>
              <dt className="font-venuscom text-caption uppercase tracking-[0.04em] text-black-olive/60">
                Вес/объём
              </dt>
              <dd className="font-venuscom text-body-sm text-black-olive">{weightLabel}</dd>
            </div>
          )}
          {product.calories && (
            <div>
              <dt className="font-venuscom text-caption uppercase tracking-[0.04em] text-black-olive/60">
                Калории
              </dt>
              <dd className="font-venuscom text-body-sm text-black-olive">
                {product.calories} ккал
              </dd>
            </div>
          )}
        </dl>

        <p className="mt-8 font-venuscom text-heading-sm font-semibold text-black-olive">
          {formatPrice(product.price, product.currency)}
        </p>

        <div className="mt-6 max-w-xs">
          <QtyStepper
            productId={product.id}
            name={product.name}
            price={product.price}
            imageUrl={product.imageUrl}
            unit={weightLabel ?? ""}
            max={product.stockQuantity}
            variant="cta"
          />
        </div>
      </div>
    </div>
  );
}
