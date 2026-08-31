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
  await seedSitePages();
  await seedBanners();
  await seedOrders();
  // backfillCustomers ОБЯЗАН быть последним: он привязывает Customer и к демо-заказам
  // из seedOrders, и к историческим заказам без customerId.
  await backfillCustomers();
}

// Демо-заказы для дашборда и раздела «Клиенты» — на свежей БД обе секции иначе пустые
// (docs/plan.md, хвост пункта 35). Идемпотентно: upsert по фиксированным id.
// Товары — реальные id/цены из menu.json (цена берётся снимком из БД, не хардкодится).
// customerId здесь не ставим — его проставит backfillCustomers() по телефону.
//
// ВАЖНО про уникальность: на Neon ещё висит `@unique` на `Customer.email` (миграция
// drop_customer_email_unique закоммичена, но не применена). backfillCustomers() upsert-ит
// Customer по телефону и пишет email — поэтому каждый отдельный телефон здесь имеет
// свой отдельный email, а заказы одного клиента делят и телефон, и email.
const ORDER_FIXTURES: Array<{
  id: number;
  customerName: string;
  phone: string;
  email: string;
  status: "NEW" | "IN_PROGRESS" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
  daysAgo: number;
  items: { productId: number; quantity: number }[];
}> = [
  // Анна Смирнова — 2 заказа (свежий + давний, для «истории клиента»)
  {
    id: 9012,
    customerName: "Анна Смирнова",
    phone: "+7 900 123-45-01",
    email: "anna.smirnova@example.com",
    status: "NEW",
    daysAgo: 1,
    items: [
      { productId: 6, quantity: 2 }, // Капучино
      { productId: 46, quantity: 1 }, // Круассан с шоколадом
    ],
  },
  {
    id: 9005,
    customerName: "Анна Смирнова",
    phone: "+7 900 123-45-01",
    email: "anna.smirnova@example.com",
    status: "DELIVERED",
    daysAgo: 15,
    items: [
      { productId: 8, quantity: 1 }, // Латте
      { productId: 32, quantity: 2 }, // Печенье "Бискотти"
    ],
  },
  // Игорь Петров — 2 заказа
  {
    id: 9011,
    customerName: "Игорь Петров",
    phone: "+7 900 123-45-02",
    email: "igor.petrov@example.com",
    status: "IN_PROGRESS",
    daysAgo: 2,
    items: [
      { productId: 1, quantity: 1 }, // Двойной эспрессо
      { productId: 39, quantity: 1 }, // Штрудель яблочный
    ],
  },
  {
    id: 9004,
    customerName: "Игорь Петров",
    phone: "+7 900 123-45-02",
    email: "igor.petrov@example.com",
    status: "CANCELLED",
    daysAgo: 19,
    items: [{ productId: 9, quantity: 1 }], // Раф
  },
  // Светлана Антонова — 2 заказа
  {
    id: 9010,
    customerName: "Светлана Антонова",
    phone: "+7 900 123-45-03",
    email: "svetlana.antonova@example.com",
    status: "PREPARING",
    daysAgo: 4,
    items: [{ productId: 64, quantity: 1 }], // Десерт "Соленая карамель"
  },
  {
    id: 9002,
    customerName: "Светлана Антонова",
    phone: "+7 900 123-45-03",
    email: "svetlana.antonova@example.com",
    status: "DELIVERED",
    daysAgo: 27,
    items: [{ productId: 64, quantity: 2 }],
  },
  // Разовые клиенты
  {
    id: 9009,
    customerName: "Дмитрий Волков",
    phone: "+7 900 123-45-04",
    email: "dmitry.volkov@example.com",
    status: "NEW",
    daysAgo: 6,
    items: [{ productId: 6, quantity: 3 }], // Капучино
  },
  {
    id: 9008,
    customerName: "Ольга Титова",
    phone: "+7 900 123-45-06",
    email: "olga.titova@example.com",
    status: "READY",
    daysAgo: 9,
    items: [{ productId: 39, quantity: 2 }], // Штрудель яблочный
  },
  {
    id: 9007,
    customerName: "Николай Романов",
    phone: "+7 900 123-45-07",
    email: "nikolay.romanov@example.com",
    status: "DELIVERED",
    daysAgo: 12,
    items: [{ productId: 70, quantity: 1 }], // Торт "Медовик"
  },
  {
    id: 9006,
    customerName: "Марина Ковалёва",
    phone: "+7 900 123-45-09",
    email: "marina.kovaleva@example.com",
    status: "DELIVERED",
    daysAgo: 14,
    items: [
      { productId: 6, quantity: 1 },
      { productId: 39, quantity: 1 },
    ],
  },
  {
    id: 9003,
    customerName: "Пётр Соколов",
    phone: "+7 900 123-45-10",
    email: "petr.sokolov@example.com",
    status: "DELIVERED",
    daysAgo: 22,
    items: [
      { productId: 50, quantity: 1 }, // Сэндвич с куриными стрипсами
      { productId: 8, quantity: 2 }, // Латте
    ],
  },
  {
    id: 9001,
    customerName: "Елена Морозова",
    phone: "+7 900 123-45-11",
    email: "elena.morozova@example.com",
    status: "DELIVERED",
    daysAgo: 33,
    items: [
      { productId: 68, quantity: 1 }, // Торт "Фисташковая меренга"
      { productId: 65, quantity: 2 }, // Эклер ванильный
    ],
  },
];

async function seedOrders() {
  for (const f of ORDER_FIXTURES) {
    // Цена/имя товара — снимком из уже засиженного каталога, а не из фикстуры.
    const products = await prisma.product.findMany({
      where: { id: { in: f.items.map((i) => i.productId) } },
      select: { id: true, name: true, price: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const orderItems = f.items.flatMap((i) => {
      const p = byId.get(i.productId);
      if (!p) return []; // товар из фикстуры не найден в menu.json — пропускаем позицию
      return [
        {
          productId: p.id,
          productNameSnapshot: p.name,
          priceSnapshot: p.price,
          quantity: i.quantity,
        },
      ];
    });
    if (orderItems.length === 0) continue; // заказ без позиций не создаём

    const totalAmount = orderItems.reduce((s, it) => s + it.priceSnapshot * it.quantity, 0);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - f.daysAgo);

    await prisma.order.upsert({
      where: { id: f.id },
      // update — только скаляры: вложенный items.create здесь плодил бы дубли позиций
      // при повторном сиде. Позиции создаются один раз в create-ветке.
      update: { status: f.status, totalAmount, createdAt },
      create: {
        id: f.id,
        status: f.status,
        customerName: f.customerName,
        customerContact: f.phone,
        customerEmail: f.email,
        totalAmount,
        createdAt,
        items: { create: orderItems },
      },
    });
  }

  // id заказов проставлены вручную — двигаем SERIAL-последовательность, чтобы
  // следующая настоящая заявка (POST /api/orders без явного id) не столкнулась с занятым.
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Order"', 'id'), COALESCE((SELECT MAX(id) FROM "Order"), 1))`;
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
// пункты 7/19). Раньше это был мок lib/shared/reviews.ts; по docs/architecture.md
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
