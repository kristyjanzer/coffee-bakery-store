import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage } from "@fortawesome/free-solid-svg-icons";
import { formatPrice } from "@/lib/utils";
import type { MenuProduct } from "@/lib/menu";
import { QtyStepper } from "@/components/catalog/QtyStepper";

interface ProductCardProps {
  product: MenuProduct;
}

// QtyStepper пока считает количество локально, без cartStore — тот появится
// в задаче 8 (docs/plan.md). У всех товаров пока нет фото (image_url пустой
// в menu.json) — вместо него нейтральная плашка-заглушка.
export function ProductCard({ product }: ProductCardProps) {
  const weightLabel = product.volumeMl
    ? `${product.volumeMl} мл`
    : product.weightG
      ? `${product.weightG} г`
      : null;

  return (
    <article className="flex flex-col">
      {product.imageUrl ? (
        <div className="relative aspect-square w-full">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-sage-mist/30">
          <FontAwesomeIcon icon={faImage} className="h-8 w-8 text-black-olive/20" />
        </div>
      )}

      <div className="mt-[30px]">
        <h3 className="font-venuscom text-body-lg text-black-olive">{product.name}</h3>
        {weightLabel && (
          <p className="mt-1 font-venuscom text-caption text-black-olive/60">{weightLabel}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="font-venuscom text-body-sm font-semibold text-black-olive">
            {formatPrice(product.price, product.currency)}
          </span>
          <QtyStepper max={product.stockQuantity} />
        </div>
      </div>
    </article>
  );
}
