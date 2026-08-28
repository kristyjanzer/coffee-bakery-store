import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import rawMenu from "@/menu.json";
import { slugify } from "@/lib/utils";
import { normalizePhone } from "@/lib/validations/order";

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

  await seedReviews();
  await seedAdminUser();
  await backfillCustomers();
  await seedSitePages();
  await seedBanners();
}

// Три фиксированные страницы витрины (docs/plan.md, пункт 20). upsert с update: {} —
// только создать отсутствующие, не перетирать правки, сделанные через админку.
async function seedSitePages() {
  const pages = [
    {
      slug: "about",
      title: "О нас",
      content:
        "Мы — небольшая кофейня-пекарня в центре города. Печём хлеб и десерты каждое утро, " +
        "варим кофе на свежеобжаренных зёрнах. Адрес: ул. Примерная, 10. Часы работы: 8:00-21:00 ежедневно.",
      seoTitle: "О нас — Coffee Bakery",
      seoDescription: "История кофейни-пекарни, адрес и часы работы.",
    },
    {
      slug: "contacts",
      title: "Контакты",
      content: "Телефон: +7 (900) 000-00-00. Email: hello@example.com. Адрес: ул. Примерная, 10.",
      seoTitle: "Контакты — Coffee Bakery",
      seoDescription: "Телефон, email и адрес кофейни-пекарни.",
    },
    {
      slug: "delivery",
      title: "Доставка и оплата",
      content:
        "Самовывоз бесплатно. Доставка по городу — от 200 ₽, срок 60-90 минут. Оплата наличными " +
        "или картой курьеру при получении.",
      seoTitle: "Доставка и оплата — Coffee Bakery",
      seoDescription: "Условия доставки и способы оплаты заказов.",
    },
  ];
  for (const page of pages) {
    await prisma.sitePage.upsert({ where: { slug: page.slug }, update: {}, create: page });
  }
}

// Демо-баннеры — только если таблица пуста (не перетирать правки пользователя).
async function seedBanners() {
  if ((await prisma.banner.count()) > 0) return;
  await prisma.banner.createMany({
    data: [
      { imageUrl: "", title: "Сезонное меню уже в продаже", link: "#menu", isActive: true, sortOrder: 0 },
      { imageUrl: "", title: "Скидка 10% при самовывозе", link: "#menu", isActive: false, sortOrder: 1 },
    ],
  });
}

// Исторические заказы (созданные до появления связи Order↔Customer) — привязать к
// Customer по нормализованному телефону. Идемпотентно: после первого прогона
// заказов с customerId: null не остаётся.
async function backfillCustomers() {
  const orphanOrders = await prisma.order.findMany({
    where: { customerId: null },
    select: { id: true, customerName: true, customerContact: true, customerEmail: true },
  });
  for (const order of orphanOrders) {
    const phone = normalizePhone(order.customerContact);
    const customer = await prisma.customer.upsert({
      where: { phone },
      update: { name: order.customerName, email: order.customerEmail },
      create: { name: order.customerName, phone, email: order.customerEmail },
    });
    await prisma.order.update({ where: { id: order.id }, data: { customerId: customer.id } });
  }
}

// Отзывы для слайдера на главной и раздела "Отзывы" в админке (docs/plan.md,
// пункты 7/19). Раньше это был мок lib/reviews.ts; по docs/architecture.md
// ("Сидирование") Review в menu.json не хранится и наполняется отдельной
// фикстурой — вот она. productId резолвится по имени товара из уже засиженного
// каталога (у части товаров кавычки в названии — прямые "...", как в menu.json).
// Отзывы 5 и 7 намеренно "на модерации" (isApproved: false) — иначе очередь
// модерации в админке не на чем проверить.
const REVIEW_FIXTURES: Array<{
  id: number;
  authorName: string;
  quoteText: string;
  productName: string;
  isApproved: boolean;
}> = [
  {
    id: 1,
    authorName: "Марина К.",
    quoteText:
      "Круассан с шоколадом — просто восторг: слоёное тесто хрустит, а начинка не приторная. Беру каждые выходные.",
    productName: "Круассан с шоколадом",
    isApproved: true,
  },
  {
    id: 2,
    authorName: "Игорь П.",
    quoteText:
      "Двойной эспрессо здесь варят как надо — плотная крема, никакой кислинки. Лучший кофе в округе.",
    productName: "Двойной эспрессо",
    isApproved: true,
  },
  {
    id: 3,
    authorName: "Светлана А.",
    quoteText:
      'Десерт "Соленая карамель" — отдельный вид искусства. Карамель в меру солёная, не приторная, орехи чувствуются в каждой ложке.',
    productName: 'Десерт "Соленая карамель"',
    isApproved: true,
  },
  {
    id: 4,
    authorName: "Дмитрий В.",
    quoteText:
      "Раф здесь топят, а не просто взбивают — вкус ванили чувствуется, но в меру. Стал брать вместо капучино.",
    productName: "Раф",
    isApproved: true,
  },
  {
    id: 5,
    authorName: "Ольга Т.",
    quoteText:
      "Штрудель яблочный — как у бабушки, только без очереди на кухне. Яблоко не разваливается, корица не забивает вкус.",
    productName: "Штрудель яблочный",
    isApproved: false,
  },
  {
    id: 6,
    authorName: "Анна С.",
    quoteText:
      'Медовик здесь — эталон: коржи тонкие, пропитка щедрая, крем не приторный. Берём целый торт на семейные посиделки уже не первый раз.',
    productName: 'Торт "Медовик"',
    isApproved: true,
  },
  {
    id: 7,
    authorName: "Николай Р.",
    quoteText:
      'Бискотти здесь именно такое, каким должно быть — плотное, в меру сладкое, отлично идёт с кофе. Беру домой пачками.',
    productName: 'Печенье "Бискотти"',
    isApproved: false,
  },
];

async function seedReviews() {
  for (const fixture of REVIEW_FIXTURES) {
    const product = await prisma.product.findFirst({
      where: { name: fixture.productName },
      select: { id: true },
    });

    const data = {
      authorName: fixture.authorName,
      quoteText: fixture.quoteText,
      isApproved: fixture.isApproved,
      productId: product?.id ?? null,
    };

    await prisma.review.upsert({
      where: { id: fixture.id },
      update: data,
      create: { id: fixture.id, ...data },
    });
  }

  // Как и у Product — id проставлены вручную, двигаем SERIAL-последовательность,
  // чтобы отзыв, добавленный позже без явного id, не столкнулся с занятым.
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Review"', 'id'), COALESCE((SELECT MAX(id) FROM "Review"), 1))`;
}

// Первый аккаунт администратора (docs/plan.md, пункт 31) — без этого войти в
// /pekarnya-control/* было бы некем. Не хардкодим пароль в коде: если переменные
// не заданы, сид просто пропускает этот шаг (не роняет весь seed, например в CI).
async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD не заданы — пропускаю сид админа");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.upsert({
    where: { email: email.trim().toLowerCase() },
    update: { passwordHash },
    create: { email: email.trim().toLowerCase(), passwordHash },
  });

  // Опциональный второй аккаунт с ролью ORDER_MANAGER (задача 76) — чтобы было на
  // ком проверить ADMIN-only разделы. Как и основной админ: без переменных шаг
  // просто пропускается.
  const managerEmail = process.env.SEED_MANAGER_EMAIL;
  const managerPassword = process.env.SEED_MANAGER_PASSWORD;
  if (managerEmail && managerPassword) {
    const managerHash = await bcrypt.hash(managerPassword, 10);
    await prisma.adminUser.upsert({
      where: { email: managerEmail.trim().toLowerCase() },
      update: { passwordHash: managerHash, role: "ORDER_MANAGER" },
      create: {
        email: managerEmail.trim().toLowerCase(),
        passwordHash: managerHash,
        role: "ORDER_MANAGER",
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
