import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import rawMenu from "@/menu.json";
import { slugify } from "@/lib/utils";

interface RawMenuItem {
  id: number;
  name: string;
  price: number;
  currency: string;
  stock_quantity: number | null;
  image_url: string;
  volume_ml?: number;
  weight_g?: number;
  calories?: number;
  description?: string;
  composition?: string;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
}

interface RawMenuCategory {
  category: string;
  items: RawMenuItem[];
}

interface RawMenu {
  shop_name: string;
  categories: RawMenuCategory[];
}

const menu = rawMenu as RawMenu;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const [index, category] of menu.categories.entries()) {
    const slug = slugify(category.category);
    const savedCategory = await prisma.category.upsert({
      where: { slug },
      update: { name: category.category, sortOrder: index },
      create: { name: category.category, slug, sortOrder: index },
    });

    for (const item of category.items) {
      const data = {
        name: item.name,
        price: item.price,
        currency: item.currency,
        stockQuantity: item.stock_quantity,
        imageUrl: item.image_url || null,
        volumeMl: item.volume_ml ?? null,
        weightG: item.weight_g ?? null,
        calories: item.calories ?? null,
        description: item.description ?? null,
        composition: item.composition ?? null,
        protein: item.protein_g ?? null,
        fat: item.fat_g ?? null,
        carbs: item.carbs_g ?? null,
        categoryId: savedCategory.id,
      };

      await prisma.product.upsert({
        where: { id: item.id },
        update: data,
        create: { id: item.id, ...data },
      });
    }
  }

  // Product.id проставляется вручную из menu.json (create выше), поэтому SERIAL-последовательность
  // Postgres не сдвигается сама — без этого следующий INSERT без явного id (например, из будущей
  // формы добавления товара в админке) столкнётся с уже занятым id и упадёт на уникальном ключе.
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Product"', 'id'), COALESCE((SELECT MAX(id) FROM "Product"), 1))`;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
