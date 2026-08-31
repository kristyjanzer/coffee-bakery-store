import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faImage } from "@fortawesome/free-solid-svg-icons";
import { formatPrice } from "@/lib/utils";
import type { MenuProduct } from "@/lib/shared/menu";
import { QtyStepper } from "@/components/catalog/QtyStepper";

interface ProductDetailProps {
  product: MenuProduct;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const weightLabel = product.volumeMl
    ? `${product.volumeMl} мл`
    : product.weightG
      ? `${product.weightG} г`
      : null;

  // КБЖУ (docs/plan.md, пункт 11) — из menu.json (calories/protein_g/fat_g/carbs_g).
  // Показываем только те значения, что реально заданы у товара.
  const nutrition = [
    product.calories != null ? { label: "Ккал", value: String(product.calories) } : null,
    product.protein != null ? { label: "Белки", value: `${product.protein} г` } : null,
    product.fat != null ? { label: "Жиры", value: `${product.fat} г` } : null,
    product.carbs != null ? { label: "Углеводы", value: `${product.carbs} г` } : null,
  ].filter((entry): entry is { label: string; value: string } => entry !== null);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-[30px]">
      {/* Стиль Ghost/Outlined Navigation Item из DESIGN.md (как активный пункт "ГЛАВНАЯ" в
          Header), но с тёмными border/иконкой — секция товара на светлом Warm Cream фоне,
          а не на тёмном Black Olive, как хедер. */}
      <Link
        href="/"
        aria-label="Назад на главную"
        className="flex size-10 shrink-0 items-center justify-center self-start rounded-sm border border-black-olive text-black-olive transition-opacity hover:opacity-70"
      >
        <FontAwesomeIcon icon={faChevronLeft} className="size-4" />
      </Link>

      <div className="grid flex-1 gap-10 lg:grid-cols-2 lg:gap-[60px]">
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

          {product.description && (
            <p className="mt-4 font-venuscom text-body-sm text-black-olive/80">
              {product.description}
            </p>
          )}

          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
            {weightLabel && (
              <div>
                <dt className="font-venuscom text-caption uppercase tracking-[0.04em] text-black-olive/60">
                  Вес/объём
                </dt>
                <dd className="font-venuscom text-body-sm text-black-olive">{weightLabel}</dd>
              </div>
            )}
            {nutrition.map((entry) => (
              <div key={entry.label}>
                <dt className="font-venuscom text-caption uppercase tracking-[0.04em] text-black-olive/60">
                  {entry.label}
                </dt>
                <dd className="font-venuscom text-body-sm text-black-olive">{entry.value}</dd>
              </div>
            ))}
          </dl>

          {product.composition && (
            <div className="mt-6">
              <p className="font-venuscom text-caption uppercase tracking-[0.04em] text-black-olive/60">
                Состав
              </p>
              <p className="mt-1 font-venuscom text-body-sm text-black-olive">{product.composition}</p>
            </div>
          )}

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
    </div>
  );
}
