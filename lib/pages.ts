export type PageSlug = "about" | "contacts" | "delivery";

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

// Временный источник данных до подключения Prisma (docs/plan.md, пункты 22-25) —
// тот же приём, что в lib/reviews.ts/lib/products.ts: сигнатуры уже async/Promise,
// замена на реальные запросы будет "тихой", без переделки страниц.
//
// Модель данных под docs/about-project.md, раздел "Управление страницами": контент
// трёх фиксированных страниц (О нас/Контакты/Доставка и оплата) + SEO title/description
// для каждой, плюс баннеры/слайдер на главной.
const SITE_PAGES: SitePage[] = [
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

const BANNERS: Banner[] = [
  {
    id: 1,
    imageUrl: "",
    title: "Сезонное меню уже в продаже",
    link: "#menu",
    isActive: true,
  },
  {
    id: 2,
    imageUrl: "",
    title: "Скидка 10% при самовывозе",
    link: "#menu",
    isActive: false,
  },
];

export async function getSitePages(): Promise<SitePage[]> {
  return SITE_PAGES;
}

export async function getSitePageBySlug(slug: PageSlug): Promise<SitePage | undefined> {
  return SITE_PAGES.find((page) => page.slug === slug);
}

export async function getBanners(): Promise<Banner[]> {
  return BANNERS;
}

export type SitePageInput = Omit<SitePage, "slug">;

// Заглушка: PATCH /api/pages/[slug] ещё не существует (появится вместе с остальными
// админскими мутациями в пунктах 22-30 плана). Не мутирует SITE_PAGES — тот же принцип,
// что moderateReview()/updateProduct(): вызывающий компонент держит новое состояние сам.
export function updateSitePage(slug: PageSlug, input: SitePageInput): Promise<{ success: true }> {
  void slug;
  void input;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 500);
  });
}

export type BannerInput = Omit<Banner, "id"> & { id: number | null };

// Заглушка сохранения всего списка баннеров разом (добавление/удаление/переупорядочивание
// в одной операции) — проще, чем отдельные create/update/delete-заглушки под каждую строку,
// а на UI баннеры и так редактируются и сохраняются одной кнопкой.
export function saveBanners(banners: BannerInput[]): Promise<{ success: true }> {
  void banners;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 500);
  });
}
