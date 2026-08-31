import { prisma } from "@/lib/prisma";

export interface Category {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
}

// Категории читаются напрямую из Prisma (docs/plan.md, пункт 26) — в том же порядке,
// что и в menu.json при сидировании (sortOrder), для стабильного порядка табов.
export async function getCategories(): Promise<Category[]> {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, sortOrder: true },
  });
}
