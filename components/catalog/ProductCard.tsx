import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage } from "@fortawesome/free-solid-svg-icons";
import { formatPrice, saveCatalogScrollPosition } from "@/lib/utils";
import type { MenuProduct } from "@/lib/menu";
import { QtyStepper } from "@/components/catalog/QtyStepper";

interface ProductCardProps {
  product: MenuProduct;
}

// У всех товаров пока нет фото (image_url пустой в menu.json) — вместо него
// нейтральная плашка-заглушка.
export function ProductCard({ product }: ProductCardProps) {
  const weightLabel = product.volumeMl
    ? `${product.volumeMl} мл`
    : product.weightG
      ? `${product.weightG} г`
      : null;

  return (
    <article className="group relative z-0 flex h-full flex-col p-[15px] transition-transform duration-200 ease-out hover:z-10 hover:-translate-y-1 hover:shadow-[0_13px_34px_-20px_rgba(29,11,13,0.45)]">
      <Link
        href={`/product/${product.id}`}
        className="block"
        onClick={saveCatalogScrollPosition}
      >
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
            <FontAwesomeIcon icon={faImage} className="size-8 text-black-olive/20" />
          </div>
        )}
      </Link>

      {/* flex-1 + mt-auto на цене — цена и "+" всегда приклеены к низу карточки,
          независимо от того, сколько строк занимает название соседних товаров в ряду. */}
      <div className="mt-[30px] flex flex-1 flex-col">
        <Link href={`/product/${product.id}`} onClick={saveCatalogScrollPosition}>
          <h3 className="font-venuscom text-body-lg text-black-olive">{product.name}</h3>
        </Link>
        {weightLabel && (
          <p className="mt-1 font-venuscom text-caption text-black-olive/60">{weightLabel}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-venuscom text-body-sm font-semibold text-black-olive">
            {formatPrice(product.price, product.currency)}
          </span>
          <QtyStepper
            productId={product.id}
            name={product.name}
            price={product.price}
            imageUrl={product.imageUrl}
            unit={weightLabel ?? ""}
            max={product.stockQuantity}
          />
        </div>
      </div>
    </article>
  );
}
