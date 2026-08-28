import { z } from "zod";

// Одна строка баннера/слайдера главной (docs/plan.md, пункт 20). imageUrl может быть
// пустым (баннер без картинки), а title/link нужны всегда. Фото пока задаётся URL
// вручную; виджет загрузки можно добавить по образцу ProductForm (пункт 34) отдельно.
export const bannerInputSchema = z.object({
  imageUrl: z.string().trim().max(500),
  title: z.string().trim().min(1, "Укажите заголовок баннера").max(200),
  link: z.string().trim().min(1, "Укажите ссылку").max(500),
  isActive: z.boolean(),
});

// PUT /api/banners заменяет весь список разом — тело это массив строк (пустой = все
// баннеры удалены). Лимит 20 — чтобы форма не прислала абсурдный объём.
export const bannerListSchema = z.array(bannerInputSchema).max(20);
export type BannerInputParsed = z.infer<typeof bannerInputSchema>;
