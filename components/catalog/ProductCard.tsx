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
    <article className="group relative z-0 flex h-full flex-col p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-transform duration-200 ease-out hover:z-10 hover:-translate-y-1">
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
          {/* На мобильных body-lg (20px) сжимает карточку в 2-колоночной сетке —
              по запросу пользователя уменьшено до 18px, начиная с sm: (переход на
              широкую сетку) возвращается токен DESIGN.md. */}
          <h3 className="font-venuscom text-[18px] text-black-olive sm:text-body-lg">
            {product.name}
          </h3>
        </Link>
        {weightLabel && (
          <p className="mt-1 font-venuscom text-caption text-black-olive/60">{weightLabel}</p>
        )}
        {/* На узких карточках (2 колонки на мобильных) цена + степпер "−/N/+" не
            помещаются в один ряд — складываем в столбец, прижатый вправо, пока карточка
            не станет достаточно широкой (sm: тот же брейкпоинт, на котором сетка
            переходит с 2 на 3 колонки). */}
        <div className="mt-auto flex flex-col items-end gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
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
