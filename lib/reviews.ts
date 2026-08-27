export interface Review {
  id: number;
  authorName: string;
  quoteText: string;
  productName: string;
  imageUrl: string;
  isApproved: boolean;
  shopReply: string | null;
}

// Временный источник отзывов до подключения Prisma (docs/plan.md, пункты 22-25) — по
// docs/architecture.md, раздел "Сидирование", Review в menu.json не хранится, а добавляется
// вручную через админку или отдельным seed-фикстурой. Пока такого сидирования нет, здесь —
// правдоподобные тестовые отзывы, привязанные к реальным товарам из menu.json. Фото у отзывов
// нет по той же причине, что и у товаров (image_url пустой в menu.json) — тот же плейсхолдер,
// что и в ProductCard, сработает и здесь без переделок, когда фото появятся.
//
// isApproved/shopReply — поля модерации (docs/plan.md, пункт 19; about-project.md, раздел
// "Отзывы"). 2 отзыва (id 5, 7) иллюстративно помечены "на модерации" — иначе в разделе
// "Отзывы" админки не на чем проверить очередь.
const ALL_REVIEWS: Review[] = [
  {
    id: 1,
    authorName: "Марина К.",
    quoteText:
      "Круассан с шоколадом — просто восторг: слоёное тесто хрустит, а начинка не приторная. Беру каждые выходные.",
    productName: "Круассан с шоколадом",
    imageUrl: "",
    isApproved: true,
    shopReply: null,
  },
  {
    id: 2,
    authorName: "Игорь П.",
    quoteText:
      "Двойной эспрессо здесь варят как надо — плотная крема, никакой кислинки. Лучший кофе в округе.",
    productName: "Двойной эспрессо",
    imageUrl: "",
    isApproved: true,
    shopReply: null,
  },
  {
    id: 3,
    authorName: "Светлана А.",
    quoteText:
      "Десерт \"Соленая карамель\" — отдельный вид искусства. Карамель в меру солёная, не приторная, орехи чувствуются в каждой ложке.",
    productName: "Десерт \"Соленая карамель\"",
    imageUrl: "",
    isApproved: true,
    shopReply: null,
  },
  {
    id: 4,
    authorName: "Дмитрий В.",
    quoteText:
      "Раф здесь топят, а не просто взбивают — вкус ванили чувствуется, но в меру. Стал брать вместо капучино.",
    productName: "Раф",
    imageUrl: "",
    isApproved: true,
    shopReply: null,
  },
  {
    id: 5,
    authorName: "Ольга Т.",
    quoteText:
      "Штрудель яблочный — как у бабушки, только без очереди на кухне. Яблоко не разваливается, корица не забивает вкус.",
    productName: "Штрудель яблочный",
    imageUrl: "",
    isApproved: false,
    shopReply: null,
  },
  {
    id: 6,
    authorName: "Анна С.",
    quoteText:
      "Медовик в баночке удобно брать с собой — и вкус не страдает: мёд не приторный, коржи мягкие, сметанный крем в меру сладкий.",
    productName: "Пирожное \"Медовик\" в банке",
    imageUrl: "",
    isApproved: true,
    shopReply: null,
  },
  {
    id: 7,
    authorName: "Николай Р.",
    quoteText:
      "Бискотти здесь именно такое, каким должно быть — плотное, в меру сладкое, отлично идёт с кофе. Беру домой пачками.",
    productName: "Печенье \"Бискотти\"",
    imageUrl: "",
    isApproved: false,
    shopReply: null,
  },
];

// Публичная витрина (ReviewsSlider на главной, уведомления — раньше и на дашборде тоже, но
// там теперь getAdminReviews(), см. ниже) — только одобренные, в этом и смысл модерации.
export function getReviews(): Review[] {
  return ALL_REVIEWS.filter((review) => review.isApproved);
}

// --- Админка: раздел "Отзывы" (docs/plan.md, пункт 19) ---
//
// В отличие от публичной getReviews(), админке нужно видеть все отзывы, включая
// неодобренные — иначе их не промодерировать. Сигнатуры уже async/Promise — тихая
// замена на Prisma-запросы без переделки страниц, как в lib/products.ts/lib/customers.ts.

export interface ReviewFilters {
  isApproved?: boolean;
}

export async function getAdminReviews(filters: ReviewFilters = {}): Promise<Review[]> {
  if (filters.isApproved === undefined) return ALL_REVIEWS;
  return ALL_REVIEWS.filter((review) => review.isApproved === filters.isApproved);
}

export async function getAdminReviewById(id: number): Promise<Review | undefined> {
  return ALL_REVIEWS.find((review) => review.id === id);
}

// Заглушка для админки. Реальный роут PATCH /api/reviews/[id] уже есть (пункт 30
// плана, lib/reviewsApi.ts), но раздел админки "Отзывы" на Prisma ещё не переведён —
// это пункт 35. Пока не мутирует ALL_REVIEWS (нет реального хранилища) — тот же
// принцип, что updateOrderStatus() в lib/orders.ts: вызывающий компонент сам держит
// новое состояние локально.
export function moderateReview(
  id: number,
  input: { isApproved: boolean; shopReply: string | null }
): Promise<{ success: true }> {
  void id;
  void input;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 500);
  });
}
