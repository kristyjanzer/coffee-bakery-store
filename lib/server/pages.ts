import { prisma } from "@/lib/prisma";
import type { PageSlug } from "@/lib/validations/page";

export type { PageSlug };

// Контент трёх фиксированных страниц витрины + SEO, а также баннеры главной
// (docs/plan.md, пункт 20). Читается напрямую из Prisma — Server Component не ходит
// через свой /api/*. Мутации из клиентских форм админки — в lib/api-client/pageAdminApi.ts.
export interface SitePage {
  slug: PageSlug;
  title: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
}
export interface Banner {
  id: number;
  imageUrl: string;
  title: string;
  link: string;
  isActive: boolean;
}
export type SitePageInput = Omit<SitePage, "slug">;
export type BannerInput = Omit<Banner, "id"> & { id: number | null };

export async function getSitePages(): Promise<SitePage[]> {
  const rows = await prisma.sitePage.findMany({ orderBy: { slug: "asc" } });
  return rows.map(toSitePage);
}

export async function getSitePageBySlug(slug: PageSlug): Promise<SitePage | undefined> {
  const row = await prisma.sitePage.findUnique({ where: { slug } });
  return row ? toSitePage(row) : undefined;
}

export async function getBanners(): Promise<Banner[]> {
  const rows = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((b) => ({
    id: b.id, imageUrl: b.imageUrl, title: b.title, link: b.link, isActive: b.isActive,
  }));
}

function toSitePage(row: {
  slug: string; title: string; content: string; seoTitle: string; seoDescription: string;
}): SitePage {
  return {
    slug: row.slug as PageSlug,
    title: row.title, content: row.content,
    seoTitle: row.seoTitle, seoDescription: row.seoDescription,
  };
}
