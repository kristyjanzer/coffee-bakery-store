import { z } from "zod";

// Три фиксированные страницы витрины (docs/about-project.md, раздел «Управление
// страницами»): контент + SEO title/description. Slug — первичный ключ SitePage,
// новые страницы через админку не создаются, поэтому список закрытый.
export type PageSlug = "about" | "contacts" | "delivery";
export const PAGE_SLUGS: PageSlug[] = ["about", "contacts", "delivery"];

// Тело PATCH /api/pages/[slug]: все поля обязательны (форма всегда шлёт весь набор),
// строки триммятся и ограничены по длине — как productFormSchema для товара.
export const sitePageInputSchema = z.object({
  title: z.string().trim().min(1, "Укажите заголовок").max(200),
  content: z.string().trim().min(1, "Укажите текст страницы").max(5000),
  seoTitle: z.string().trim().min(1, "Укажите SEO title").max(200),
  seoDescription: z.string().trim().min(1, "Укажите SEO description").max(400),
});

export type SitePageInputParsed = z.infer<typeof sitePageInputSchema>;
