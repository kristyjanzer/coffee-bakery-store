"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { productFormSchema } from "@/lib/validations/product";
import { createProduct, deleteProduct, updateProduct, type AdminCategory, type AdminProduct, type ProductInput } from "@/lib/products";

export interface ProductFormState {
  name: string;
  categorySlug: string;
  price: string;
  stockQuantity: string;
  imageUrl: string;
  volumeMl: string;
  weightG: string;
  calories: string;
  description: string;
  composition: string;
  allergens: string;
  protein: string;
  fat: string;
  carbs: string;
  expiryInfo: string;
  isSeasonal: boolean;
  isActive: boolean;
}

type FormErrors = Partial<Record<keyof ProductFormState, string>>;

// "" в числовом поле формы значит "не указано" — при заполнении редактирования
// из мок-товара (lib/products.ts, число | null) конвертируем обратно в строку.
function numberToFieldValue(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function defaultValues(firstCategorySlug: string): ProductFormState {
  return {
    name: "",
    categorySlug: firstCategorySlug,
    price: "",
    stockQuantity: "",
    imageUrl: "",
    volumeMl: "",
    weightG: "",
    calories: "",
    description: "",
    composition: "",
    allergens: "",
    protein: "",
    fat: "",
    carbs: "",
    expiryInfo: "",
    isSeasonal: false,
    isActive: true,
  };
}

function valuesFromProduct(product: AdminProduct): ProductFormState {
  return {
    name: product.name,
    categorySlug: product.categorySlug,
    price: String(product.price),
    stockQuantity: numberToFieldValue(product.stockQuantity),
    imageUrl: product.imageUrl,
    volumeMl: numberToFieldValue(product.volumeMl),
    weightG: numberToFieldValue(product.weightG),
    calories: numberToFieldValue(product.calories),
    description: product.description,
    composition: product.composition,
    allergens: product.allergens,
    protein: numberToFieldValue(product.protein),
    fat: numberToFieldValue(product.fat),
    carbs: numberToFieldValue(product.carbs),
    expiryInfo: product.expiryInfo,
    isSeasonal: product.isSeasonal,
    isActive: product.isActive,
  };
}

interface ProductFormProps {
  categories: AdminCategory[];
  product?: AdminProduct;
}

// Форма создания/редактирования товара (docs/plan.md, пункт 17). createProduct()/
// updateProduct() — заглушки (POST/PATCH/DELETE /api/products появятся в пункте 27
// плана), ничего не сохраняют по-настоящему — тот же принцип, что у LoginForm/
// OrderStatusControl. После "сохранения" — редирект на список (в отличие от
// LoginForm/OrderStatusControl список товаров уже существует, редиректить есть куда).
export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const isEditing = Boolean(product);
  const [values, setValues] = useState<ProductFormState>(
    product ? valuesFromProduct(product) : defaultValues(categories[0]?.slug ?? "")
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function handleChange<K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    setSavedMessage(null);

    // Снимаем ошибку поля "на лету", как только оно становится валидным — тот же
    // приём, что в CheckoutForm/LoginForm.
    if (errors[field]) {
      const result = productFormSchema.safeParse(nextValues);
      const stillInvalid = !result.success && result.error.issues.some((issue) => issue.path[0] === field);
      if (!stillInvalid) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = productFormSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ProductFormState;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    const parsed = result.data;
    const input: ProductInput = {
      name: parsed.name,
      categorySlug: parsed.categorySlug,
      price: parsed.price,
      currency: "RUB",
      stockQuantity: parsed.stockQuantity ?? null,
      imageUrl: parsed.imageUrl ?? "",
      volumeMl: parsed.volumeMl,
      weightG: parsed.weightG,
      calories: parsed.calories,
      description: parsed.description ?? "",
      composition: parsed.composition ?? "",
      allergens: parsed.allergens ?? "",
      protein: parsed.protein ?? null,
      fat: parsed.fat ?? null,
      carbs: parsed.carbs ?? null,
      expiryInfo: parsed.expiryInfo ?? "",
      isSeasonal: parsed.isSeasonal,
      isActive: parsed.isActive,
    };

    void submitProduct(input);
  }

  async function submitProduct(input: ProductInput) {
    setIsSubmitting(true);
    if (product) {
      await updateProduct(product.id, input);
    } else {
      await createProduct(input);
    }
    setIsSubmitting(false);
    setSavedMessage("Сохранено (заглушка) — переходим к списку…");
    router.push("/pekarnya-control/products");
  }

  async function handleDelete() {
    if (!product) return;
    if (!window.confirm(`Удалить товар «${product.name}»?`)) return;

    setIsDeleting(true);
    await deleteProduct(product.id);
    setIsDeleting(false);
    router.push("/pekarnya-control/products");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="font-venuscom text-caption text-black-olive/70">
            Название
          </label>
          <Input
            id="name"
            value={values.name}
            onChange={(event) => handleChange("name", event.target.value)}
            placeholder="Например, Капучино"
            className="mt-1"
            error={Boolean(errors.name)}
          />
          {errors.name && <p className="mt-1 font-venuscom text-caption font-semibold text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="categorySlug" className="font-venuscom text-caption text-black-olive/70">
            Категория
          </label>
          <select
            id="categorySlug"
            value={values.categorySlug}
            onChange={(event) => handleChange("categorySlug", event.target.value)}
            className="mt-1 w-full rounded-sm border border-sage-mist bg-warm-cream px-4 py-3 font-venuscom text-body-sm text-black-olive focus:border-lemon-zest focus:outline-none"
          >
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categorySlug && (
            <p className="mt-1 font-venuscom text-caption font-semibold text-red-600">{errors.categorySlug}</p>
          )}
        </div>

        <div>
          <label htmlFor="price" className="font-venuscom text-caption text-black-olive/70">
            Цена, ₽
          </label>
          <Input
            id="price"
            type="number"
            inputMode="numeric"
            value={values.price}
            onChange={(event) => handleChange("price", event.target.value)}
            placeholder="270"
            className="mt-1"
            error={Boolean(errors.price)}
          />
          {errors.price && <p className="mt-1 font-venuscom text-caption font-semibold text-red-600">{errors.price}</p>}
        </div>

        <div>
          <label htmlFor="stockQuantity" className="font-venuscom text-caption text-black-olive/70">
            Остаток на складе (пусто — без лимита)
          </label>
          <Input
            id="stockQuantity"
            type="number"
            inputMode="numeric"
            value={values.stockQuantity}
            onChange={(event) => handleChange("stockQuantity", event.target.value)}
            placeholder="Без лимита"
            className="mt-1"
            error={Boolean(errors.stockQuantity)}
          />
          {errors.stockQuantity && (
            <p className="mt-1 font-venuscom text-caption font-semibold text-red-600">{errors.stockQuantity}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="imageUrl" className="font-venuscom text-caption text-black-olive/70">
            Ссылка на фото (Cloudinary/Supabase Storage — загрузка из формы появится в пункте 34 плана)
          </label>
          <Input
            id="imageUrl"
            value={values.imageUrl}
            onChange={(event) => handleChange("imageUrl", event.target.value)}
            placeholder="https://res.cloudinary.com/..."
            className="mt-1"
            error={Boolean(errors.imageUrl)}
          />
          {errors.imageUrl && (
            <p className="mt-1 font-venuscom text-caption font-semibold text-red-600">{errors.imageUrl}</p>
          )}
        </div>

        <div>
          <label htmlFor="volumeMl" className="font-venuscom text-caption text-black-olive/70">
            Объём, мл (для напитков)
          </label>
          <Input
            id="volumeMl"
            type="number"
            inputMode="numeric"
            value={values.volumeMl}
            onChange={(event) => handleChange("volumeMl", event.target.value)}
            className="mt-1"
            error={Boolean(errors.volumeMl)}
          />
          {errors.volumeMl && (
            <p className="mt-1 font-venuscom text-caption font-semibold text-red-600">{errors.volumeMl}</p>
          )}
        </div>

        <div>
          <label htmlFor="weightG" className="font-venuscom text-caption text-black-olive/70">
            Вес, г (для выпечки/еды)
          </label>
          <Input
            id="weightG"
            type="number"
            inputMode="numeric"
            value={values.weightG}
            onChange={(event) => handleChange("weightG", event.target.value)}
            className="mt-1"
            error={Boolean(errors.weightG)}
          />
          {errors.weightG && (
            <p className="mt-1 font-venuscom text-caption font-semibold text-red-600">{errors.weightG}</p>
          )}
        </div>

        <div>
          <label htmlFor="calories" className="font-venuscom text-caption text-black-olive/70">
            Калории, ккал
          </label>
          <Input
            id="calories"
            type="number"
            inputMode="numeric"
            value={values.calories}
            onChange={(event) => handleChange("calories", event.target.value)}
            className="mt-1"
            error={Boolean(errors.calories)}
          />
          {errors.calories && (
            <p className="mt-1 font-venuscom text-caption font-semibold text-red-600">{errors.calories}</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-sage-mist pt-6">
        <h2 className="font-venuscom text-subheading uppercase tracking-[0.02em] text-forest-ink">
          Карточка товара
        </h2>

        <div>
          <label htmlFor="description" className="font-venuscom text-caption text-black-olive/70">
            Описание
          </label>
          <textarea
            id="description"
            value={values.description}
            onChange={(event) => handleChange("description", event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-sm border border-sage-mist bg-warm-cream px-4 py-3 font-venuscom text-body-sm text-black-olive placeholder:text-black-olive/50 focus:border-lemon-zest focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="composition" className="font-venuscom text-caption text-black-olive/70">
              Состав
            </label>
            <textarea
              id="composition"
              value={values.composition}
              onChange={(event) => handleChange("composition", event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-sm border border-sage-mist bg-warm-cream px-4 py-3 font-venuscom text-body-sm text-black-olive placeholder:text-black-olive/50 focus:border-lemon-zest focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="allergens" className="font-venuscom text-caption text-black-olive/70">
              Аллергены
            </label>
            <textarea
              id="allergens"
              value={values.allergens}
              onChange={(event) => handleChange("allergens", event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-sm border border-sage-mist bg-warm-cream px-4 py-3 font-venuscom text-body-sm text-black-olive placeholder:text-black-olive/50 focus:border-lemon-zest focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="protein" className="font-venuscom text-caption text-black-olive/70">
              Белки, г
            </label>
            <Input
              id="protein"
              type="number"
              inputMode="decimal"
              value={values.protein}
              onChange={(event) => handleChange("protein", event.target.value)}
              className="mt-1"
              error={Boolean(errors.protein)}
            />
            {errors.protein && (
              <p className="mt-1 font-venuscom text-caption font-semibold text-red-600">{errors.protein}</p>
            )}
          </div>
          <div>
            <label htmlFor="fat" className="font-venuscom text-caption text-black-olive/70">
              Жиры, г
            </label>
            <Input
              id="fat"
              type="number"
              inputMode="decimal"
              value={values.fat}
              onChange={(event) => handleChange("fat", event.target.value)}
              className="mt-1"
              error={Boolean(errors.fat)}
            />
            {errors.fat && <p className="mt-1 font-venuscom text-caption font-semibold text-red-600">{errors.fat}</p>}
          </div>
          <div>
            <label htmlFor="carbs" className="font-venuscom text-caption text-black-olive/70">
              Углеводы, г
            </label>
            <Input
              id="carbs"
              type="number"
              inputMode="decimal"
              value={values.carbs}
              onChange={(event) => handleChange("carbs", event.target.value)}
              className="mt-1"
              error={Boolean(errors.carbs)}
            />
            {errors.carbs && (
              <p className="mt-1 font-venuscom text-caption font-semibold text-red-600">{errors.carbs}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="expiryInfo" className="font-venuscom text-caption text-black-olive/70">
            Срок годности
          </label>
          <Input
            id="expiryInfo"
            value={values.expiryInfo}
            onChange={(event) => handleChange("expiryInfo", event.target.value)}
            placeholder="Например, 3 суток при +4°C"
            className="mt-1"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-sage-mist pt-6 sm:flex-row sm:gap-8">
        <label className="flex items-center gap-2 font-venuscom text-body-sm text-black-olive">
          <input
            type="checkbox"
            checked={values.isSeasonal}
            onChange={(event) => handleChange("isSeasonal", event.target.checked)}
            className="size-4 border-sage-mist accent-forest-ink"
          />
          Сезонный/акционный товар
        </label>
        <label className="flex items-center gap-2 font-venuscom text-body-sm text-black-olive">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(event) => handleChange("isActive", event.target.checked)}
            className="size-4 border-sage-mist accent-forest-ink"
          />
          Активен (виден в каталоге)
        </label>
      </section>

      {savedMessage && (
        <p className="font-venuscom text-caption text-forest-ink">{savedMessage}</p>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-sage-mist pt-6">
        <Button type="submit" disabled={isSubmitting || isDeleting}>
          {isSubmitting ? "Сохраняем…" : "Сохранить товар"}
        </Button>
        {isEditing && (
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting || isDeleting}
            onClick={() => void handleDelete()}
            className="text-red-600 hover:text-red-600"
          >
            {isDeleting ? "Удаляем…" : "Удалить товар"}
          </Button>
        )}
      </div>
    </form>
  );
}
