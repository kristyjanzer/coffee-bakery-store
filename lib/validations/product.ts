import { z } from "zod";

// Числовые поля приходят из <input type="number"|"text"> как строки. Пустая строка
// у необязательного числового поля должна значить "не указано" (undefined), а не
// NaN — приводим её к undefined до z.coerce.number(), как советует документация zod
// для preprocess.
function emptyToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

// .optional() должен оборачивать число ВНУТРИ preprocess, а не сам preprocess
// снаружи: ZodOptional проверяет на undefined значение, которое приходит на вход
// preprocess (сырую "" из формы), а не результат transform — снаружи "" !== undefined,
// поэтому проверка всегда делегировала бы в непустой z.coerce.number() и падала
// на пустых необязательных полях.
function optionalPositiveInt(message: string) {
  return z.preprocess(emptyToUndefined, z.coerce.number({ invalid_type_error: message }).int().positive(message).optional());
}

function optionalNonNegativeNumber(message: string) {
  return z.preprocess(emptyToUndefined, z.coerce.number({ invalid_type_error: message }).min(0, message).optional());
}

// Форма товара (docs/plan.md, пункт 17) — все текстовые поля в состоянии формы
// (ProductFormState в ProductForm.tsx) хранятся строками, эта схема и парсит, и
// валидирует их в типизированный ProductInput (lib/products.ts) при отправке.
// Имена полей — как в модели Product (docs/architecture.md, раздел 3).
export const productFormSchema = z.object({
  name: z.string().trim().min(2, "Укажите название").max(200),
  categorySlug: z.string().trim().min(1, "Выберите категорию"),
  price: z.preprocess(
    emptyToUndefined,
    z.coerce.number({ invalid_type_error: "Укажите цену" }).int().positive("Цена должна быть больше 0")
  ),
  // "" в форме = "без лимита" (null в ProductInput, см. ProductForm.tsx).
  stockQuantity: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0, "Не может быть отрицательным").optional()),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  volumeMl: optionalPositiveInt("Введите положительное число"),
  weightG: optionalPositiveInt("Введите положительное число"),
  calories: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0, "Не может быть отрицательным").optional()),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  composition: z.string().trim().max(1000).optional().or(z.literal("")),
  allergens: z.string().trim().max(500).optional().or(z.literal("")),
  protein: optionalNonNegativeNumber("Введите неотрицательное число"),
  fat: optionalNonNegativeNumber("Введите неотрицательное число"),
  carbs: optionalNonNegativeNumber("Введите неотрицательное число"),
  expiryInfo: z.string().trim().max(200).optional().or(z.literal("")),
  isSeasonal: z.boolean(),
  isActive: z.boolean(),
});

export type ProductFormParsed = z.infer<typeof productFormSchema>;
