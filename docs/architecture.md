# Архитектура проекта "Coffee Bakery"

Единое Next.js-приложение (App Router) без монорепо и без отдельного backend-проекта:
фронтенд, API-роуты и админка живут в одном репозитории и деплоятся одной командой.
Это соответствует technologies.md и упрощает будущий деплой на сервер.

## 1. Структура папок

```
store/
├── app/
│   ├── layout.tsx              # корневой layout: <html>, шрифты (next/font), Font Awesome config, globals.css
│   ├── globals.css              # точка входа Tailwind
│   ├── (site)/                   # route group — публичный сайт, оборачивается Header/Footer
│   │   ├── layout.tsx             # Header + {children} + Footer (не затрагивает /pekarnya-control)
│   │   ├── page.tsx                # главная страница (Server Component)
│   │   └── product/[id]/page.tsx   # страница товара (Server Component)
│   ├── pekarnya-control/          # URL админки намеренно не /admin — сложнее найти путь
│   │   ├── login/page.tsx       # логин админа (НЕ защищён, вне route group ниже)
│   │   └── (protected)/          # route group — сайдбар (20%) + контент, сессия проверяется в proxy.ts
│   │       ├── layout.tsx
│   │       ├── page.tsx             # Dashboard
│   │       ├── orders/page.tsx, orders/[id]/page.tsx
│   │       ├── products/page.tsx, products/new/page.tsx, products/[id]/page.tsx
│   │       ├── customers/page.tsx, customers/[id]/page.tsx
│   │       ├── reviews/page.tsx, reviews/[id]/page.tsx
│   │       ├── pages/page.tsx       # О нас/Контакты/Доставка, SEO, баннеры
│   │       └── settings/page.tsx    # пользователи админки, уведомления
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── categories/route.ts
│       ├── products/route.ts            # GET (публично) / POST (админ)
│       ├── products/[id]/route.ts        # GET / PATCH / DELETE
│       ├── orders/route.ts               # POST (гость) → Telegram; GET (админ)
│       ├── orders/[id]/route.ts          # GET / PATCH статуса (админ)
│       ├── reviews/route.ts, reviews/[id]/route.ts
│       └── uploads/route.ts              # POST — фото товара в Cloudinary (админ)
│
├── components/
│   ├── layout/     # Header, Footer, Nav
│   ├── catalog/     # Catalog, CategoryTabs, ProductSection, ProductCard, ReviewsSlider
│   ├── product/      # ProductDetail
│   ├── cart/         # CartIcon, CartWidget, QtyStepper
│   ├── admin/         # Sidebar (готов), OrdersTable, ProductForm...
│   └── ui/             # общие примитивы (Button, Modal, Input)
│
├── lib/
│   ├── prisma.ts       # singleton PrismaClient (@prisma/adapter-pg, безопасно для serverless)
│   ├── auth.ts          # NextAuth authOptions, проверка роли
│   ├── telegram.ts      # notifyNewOrder() — только на сервере
│   ├── storage.ts        # uploadImage() — заливка фото товара в Cloudinary (из POST /api/uploads)
│   ├── validations/      # zod-схемы (order.ts, product.ts)
│   └── utils.ts           # formatPrice, slugify и т.д.
│
├── stores/
│   └── cartStore.ts        # zustand + persist(localStorage)
│
├── types/                    # product.ts, cart.ts, order.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts               # читает ../menu.json, наполняет БД
│   └── migrations/
├── generated/prisma/          # клиент Prisma 7 (не node_modules), в .gitignore
│
├── public/
│   └── images/                 # логотип, hero-картинка, иконки (НЕ фото товаров)
│
├── menu.json                    # остаётся источником сид-данных
├── proxy.ts                       # защищает /pekarnya-control/* (кроме /pekarnya-control/login); в Next 16 имя middleware.ts deprecated
├── prisma.config.ts               # путь схемы/миграций, seed, DIRECT_URL для CLI (Prisma 7)
├── .env / .env.example
└── next.config.js / tailwind.config.ts / tsconfig.json / package.json
```

**Почему так просто:** это один Next.js-проект, без отдельных пакетов и без микросервисов —
для учебного проекта такого масштаба разделение только усложнило бы деплой и разработку.

### Тестирование

Тесты (Vitest + React Testing Library) лежат рядом с тестируемым файлом:
`stores/cartStore.ts` → `stores/cartStore.test.ts`, `components/catalog/ProductCard.tsx` →
`components/catalog/ProductCard.test.tsx` и т.д. Отдельной папки `__tests__`/`tests` нет —
так тест всегда переезжает вместе с файлом при рефакторинге/переносе.

## 2. Роутинг

### Страницы
| Route | Тип | Комментарий |
|---|---|---|
| `/` | Server Component | категории и товары читаются из Prisma напрямую |
| `/product/[id]` | Server Component | один товар из Prisma |
| `/pekarnya-control` | защищено | Dashboard |
| `/pekarnya-control/login` | публично | форма входа |
| `/pekarnya-control/orders`, `/pekarnya-control/orders/[id]` | защищено | |
| `/pekarnya-control/products`, `/products/new`, `/products/[id]` | защищено | |
| `/pekarnya-control/customers`, `/pekarnya-control/customers/[id]` | защищено | |
| `/pekarnya-control/reviews`, `/pekarnya-control/reviews/[id]` | защищено | |
| `/pekarnya-control/pages`, `/pekarnya-control/settings` | защищено | |

### API (Route Handlers)
| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | — | NextAuth |
| `/api/categories` | GET | публично | для клиентских перезапросов (табы, формы) |
| `/api/products` | GET / POST | публично / админ | список, создание |
| `/api/products/[id]` | GET / PATCH / DELETE | публично / админ | детали, изменение, удаление |
| `/api/orders` | POST / GET | публично (создание) / админ (список) | создание заявки → Telegram |
| `/api/orders/[id]` | GET / PATCH | админ | детали, смена статуса |
| `/api/reviews` | GET | публично | одобренные отзывы для слайдера |
| `/api/reviews/[id]` | PATCH | админ | модерация, ответ магазина |
| `/api/uploads` | POST | админ | загрузка фото товара в Cloudinary → `{ url }` |

**Важное правило:** Server Component не должен ходить через `fetch()` в свой же `/api/*` —
это лишний сетевой хоп. Server Component читает данные из Prisma напрямую через `lib/prisma.ts`.
`/api/*` нужен для: (а) мутаций из Client Component (корзина → заявка, формы админки),
(б) точек, которым нужна HTTP-граница (auth callbacks).

## 3. Слой данных — набросок схемы Prisma

```prisma
model Category {
  id        Int      @id @default(autoincrement())
  name      String   @unique      // "Кофе", "Выпечка", ...
  slug      String   @unique      // для якорной прокрутки/id таба
  sortOrder Int                   // порядок как в menu.json
  products  Product[]
}

model Product {
  id            Int      @id @default(autoincrement())  // можно взять id из menu.json
  name          String
  price         Int
  currency      String   @default("RUB")
  stockQuantity Int?    // null — без лимита (готовится на заказ, напитки из menu.json)
  imageUrl      String?
  volumeMl      Int?     // напитки
  weightG       Int?     // выпечка/еда
  calories      Int?
  // поля "на вырост" под будущую админку — nullable, чтобы не переделывать схему:
  description   String?
  composition   String?
  allergens     String?
  protein       Float?
  fat           Float?
  carbs         Float?
  expiryInfo    String?
  isSeasonal    Boolean  @default(false)
  isActive      Boolean  @default(true)
  categoryId    Int
  category      Category    @relation(fields: [categoryId], references: [id])
  orderItems    OrderItem[]
  reviews       Review[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Order {
  id                 Int         @id @default(autoincrement())
  status              OrderStatus @default(NEW)
  customerName        String
  customerContact      String     // телефон — оформление без регистрации
  customerEmail        String     // на него отправляется чек об оплате (CheckoutForm, пункт 12)
  comment              String?    // "без орехов", "к 18:00"
  preferredDate         DateTime?  // дата для предзаказа
  totalAmount           Int
  paymentMethod         String?    // задел на будущее
  paymentStatus         String     @default("UNPAID")
  customerId             Int?
  customer               Customer?   @relation(fields: [customerId], references: [id])
  telegramNotifiedAt     DateTime?
  items                  OrderItem[]
  createdAt               DateTime @default(now())
  updatedAt                DateTime @updatedAt
}

enum OrderStatus { NEW IN_PROGRESS PREPARING READY DELIVERED CANCELLED }

model OrderItem {
  id                   Int      @id @default(autoincrement())
  orderId               Int
  order                  Order    @relation(fields: [orderId], references: [id])
  productId              Int
  product                 Product  @relation(fields: [productId], references: [id])
  productNameSnapshot     String   // сохраняем имя на момент заказа
  priceSnapshot            Int      // и цену — на случай если товар изменится/удалится
  quantity                  Int
}

// --- прочие модели данных ---

model Customer {
  id              Int      @id @default(autoincrement())
  name            String?
  phone           String?  @unique
  email           String?
  deliveryAddress String?
  orders          Order[]
  createdAt       DateTime @default(now())
}

model Review {
  id           Int      @id @default(autoincrement())
  productId     Int?
  product        Product? @relation(fields: [productId], references: [id])
  authorName     String
  quoteText       String
  rating           Int?
  imageUrl         String?
  isApproved       Boolean @default(true)
  shopReply        String?
  createdAt        DateTime @default(now())
}

model AdminUser {
  id           Int       @id @default(autoincrement())
  email         String    @unique
  passwordHash String
  role           AdminRole @default(ADMIN)
  createdAt      DateTime  @default(now())
}

enum AdminRole { ADMIN ORDER_MANAGER }

// --- Управление страницами (docs/plan.md, пункт 20) ---

model SitePage {
  slug           String   @id   // "about" | "contacts" | "delivery"
  title          String
  content        String
  seoTitle       String
  seoDescription String
  updatedAt      DateTime @updatedAt
}

model Banner {
  id        Int      @id @default(autoincrement())
  imageUrl  String              // "" допустимо (загрузка фото — пункт 34)
  title     String
  link      String
  isActive  Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
}

// --- Настройки уведомлений (docs/plan.md, пункт 21): singleton-строка (id всегда 1) ---

model NotificationSettings {
  id                 Int      @id @default(1)
  notifyEmail        Boolean  @default(false)
  notifyEmailAddress String   @default("")
  notifySms          Boolean  @default(false)
  notifySmsPhone     String   @default("")
  updatedAt          DateTime @updatedAt
}
```

`Customer` заполняется при создании заказа (upsert по телефону);
`SitePage`/`Banner`/`NotificationSettings` редактируются в админке (пункты 20–21), на
витрине пока не читаются.

**Сидирование:** `prisma/seed.ts` читает `../menu.json`, идёт по категориям в порядке файла
(проставляя `sortOrder`), делает upsert `Category`, затем `Product`. Запускается один раз
командой `npx prisma db seed` (сначала на локальной БД, потом один раз на проде после первой
миграции). Обязательно через upsert, а не create — чтобы повторный запуск был безопасен.
`Review` в menu.json не хранится — несколько отзывов добавляются вручную через админку или
отдельным seed-фикстурой.

## 4. Разделение состояния: Zustand vs серверные данные

**Zustand (`stores/cartStore.ts`) — только клиент, персистится в localStorage:**
- `items: CartItem[]` — `{ productId, name, price, imageUrl, quantity, unit }`
- `isWidgetOpen: boolean` — чтобы иконка корзины могла открыть виджет
- действия: `addItem`, `removeItem`, `incrementQty`, `decrementQty`, `clearCart`
- производные значения (`totalCount`, `totalPrice`) — через селекторы, не хранить отдельно

**Серверное состояние (никогда не дублируется в Zustand):**
- каталог, категории, отзывы — Server Component читает из Prisma напрямую
- заказы, данные админки — так же
- сессия авторизации — через `useSession()`/`getServerSession()`, а не через cart store

**Нюанс:** `persist` + SSR даёт рассинхронизацию гидратации (на сервере корзина пустая, на
клиенте — из localStorage). Решение: `skipHydration: true` в сторе + ре-гидрация в `useEffect`,
либо флаг "mounted" перед рендером UI, зависящего от корзины.

## 5. Server Components vs Client Components

**Server (по умолчанию):** `app/page.tsx`, `ProductSection`, `app/product/[id]/page.tsx`
(статичные части — картинка, название, состав, КБЖУ, цена), `Footer`, списковые страницы
админки (запрос данных + таблица).

**Client (`"use client"`):** `CartIcon`, `CartWidget`, `QtyStepper` (общий для карточки товара,
страницы товара и виджета корзины), `Catalog` (держит выбранный таб категории — на странице
рендерится только его `ProductSection`, не все категории подряд) + `CategoryTabs` (переключение
таба + клик-прокрутка к началу секции, drag-to-scroll мышкой по списку табов),
`ReviewsSlider` (Swiper/Embla), `Sidebar` (навигация админки, активный пункт по `usePathname`,
мобильное бургер-меню), формы админки (`ProductForm`, смена статуса заказа — запросы
к API-роутам), обёртка `SessionProvider` вокруг `pekarnya-control/(protected)/layout.tsx`.

Правило: данные запрашиваются как можно выше по дереву (Server Component), `"use client"`
опускается до самого маленького листового компонента, которому реально нужна интерактивность
(Zustand, обработчики событий, браузерные библиотеки типа Swiper).

## 6. Внешние интеграции

**Telegram** — `lib/telegram.ts` экспортирует `notifyNewOrder(order)`: обычный `fetch` на
`https://api.telegram.org/bot<TOKEN>/sendMessage`. Вызывается только из `POST` в
`app/api/orders/route.ts`, после успешной записи заказа в БД, обёрнут в try/catch — чтобы сбой
Telegram не ронял создание заказа. `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` — только на сервере,
никогда не попадают в клиентский бандл.

**Хранение изображений (Cloudinary)** — `lib/storage.ts` экспортирует `uploadImage(file)`:
`fetch` на `https://api.cloudinary.com/v1_1/<cloud_name>/image/upload` с `upload_preset`
(unsigned), обёрнут в try/catch. Вызывается только из `POST /api/uploads` — форма товара в
админке (`ProductForm`, клиентский компонент) шлёт файл туда, роут проверяет сессию `ADMIN`,
тип (`image/jpeg|png|webp|avif`) и размер (≤ 4 МБ), затем отдаёт файл в Cloudinary и
возвращает `{ url }`. Полученный URL кладётся в поле формы и уходит в БД обычным
`POST`/`PATCH /api/products[/id]` вместе с остальными полями товара.

Осознанное отклонение от прежнего наброска (грузить прямо из браузера): по общему принципу
ниже сторонние API дёргаются только из роут-хендлеров, не из клиента. Плюс серверный прокси
даёт проверку типа/размера до Cloudinary и не светит `cloud_name`/`preset` в бандл.
`CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_UPLOAD_PRESET` — только `process.env`, без `NEXT_PUBLIC_`.
Файл проходит через serverless-функцию, поэтому лимит 4 МБ (ниже потолка тела Vercel).

**Общий принцип:** роут-хендлеры — это граница интеграций. Все сторонние ключи/секреты живут
только на сервере, вызываются из хелперов в `lib/*` внутри роут-хендлеров, никогда напрямую
из клиентского кода.

## 7. Авторизация

- `lib/auth.ts` — `authOptions` для NextAuth: один `Credentials`-провайдер, проверяющий
  `AdminUser` (пароль — bcrypt-хэш), JWT-сессии (без таблицы сессий в БД — проще для
  serverless), роль (`ADMIN`/`ORDER_MANAGER`) кладётся в JWT/session callback.
- `app/api/auth/[...nextauth]/route.ts` — экспортирует хендлеры.
- UI входа: `LoginForm` зовёт `signIn("credentials", { redirect: false })` и сам ведёт на
  `callbackUrl` (его читает и валидирует как внутренний путь `login/page.tsx`); `Sidebar` —
  `signOut({ callbackUrl: "/pekarnya-control/login" })`. `(protected)/layout.tsx` обёрнут
  в `AdminSessionProvider` (клиентский `SessionProvider`).
- **Основная защита** — `proxy.ts` (в Next 16 `middleware.ts` переименован в `proxy.ts`)
  через `withAuth` из `next-auth/middleware` матчит `/pekarnya-control/:path*` (кроме
  `/pekarnya-control/login`, который `withAuth` пропускает сам как `pages.signIn`) и
  редиректит неавторизованных на страницу логина с `callbackUrl`.
- API-роуты не попадают под матчер proxy (они под `/api`, не `/pekarnya-control`), поэтому каждый
  мутирующий хендлер (`POST/PATCH/DELETE /api/products`, `GET/PATCH /api/orders`) сам
  проверяет `getServerSession(authOptions)` и роль перед обращением к Prisma. Публичные GET
  и `POST /api/orders` (гостевой чекаут) остаются открытыми.

**Задел на будущую авторизацию покупателей** (по about-project.md — email/телефон/Google/
Facebook, восстановление через Telegram): `providers` в `lib/auth.ts` — единая точка, куда
позже добавляются `Email`/`Google`/`Facebook` провайдеры без переделки структуры. Для OAuth
понадобится Prisma-адаптер NextAuth со своими таблицами `User`/`Account`/`Session`/
`VerificationToken` — они добавляются рядом с `AdminUser`, не вместо него. `Order.customerId`
и модель `Customer` уже заложены в схему — привязка гостевых заказов к аккаунту потребует
только миграции, а не редизайна. Восстановление через Telegram позже ляжет как поле
`Customer.telegramId` + отдельный флоу.

## 8. Деплой

- Один Next.js-проект → GitHub → автодеплой на Vercel (Preview на PR/ветку, Production на main).
- Postgres — управляемый инстанс на Neon или Supabase, независимо от Vercel.
- Переменные окружения задаются в Vercel per environment: `DATABASE_URL`, `DIRECT_URL`,
  `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, ключи хранилища
  картинок. `.env.local` (в .gitignore) — то же самое локально; `.env.example` документирует
  список нужных переменных.
- **Локальная БД для разработки:** проще всего — вторая бесплатная БД/ветка на Neon/Supabase
  только для дев-окружения (не нужно ставить Postgres локально). Альтернатива — Postgres в
  Docker-compose, если важна полностью офлайн-разработка.
- **Prisma 7 + driver adapters:** клиент генерируется без нативного Rust query engine
  (`prisma-client-js` → `provider = "prisma-client"` в `schema.prisma`, вывод в `generated/prisma/`
  вместо `node_modules`, добавлен в `.gitignore`). Рантайм-клиент (`lib/prisma.ts`) подключается
  через `@prisma/adapter-pg` (`PrismaPg` + `pg`) на `DATABASE_URL`. `url`/`directUrl` из
  `datasource` в `schema.prisma` убраны — оба читаются из `prisma.config.ts` (CLI/миграции) и
  `lib/prisma.ts` (рантайм) через `process.env`, `.env` грузится явно (`dotenv/config`), Prisma CLI
  сам `.env`/`.env.local` не подхватывает.
- **Singleton Prisma Client** (`lib/prisma.ts`, стандартный паттерн через `globalThis.prisma`) —
  критично для serverless и hot-reload в деве, чтобы не исчерпать лимит подключений к БД.
- **Pooled vs direct-соединение:** `DATABASE_URL` — pooled/pgbouncer строка (её использует
  приложение в рантайме через `@prisma/adapter-pg`), `DIRECT_URL` — прямое соединение
  (`prisma.config.ts` → `datasource.url`, используется CLI: миграции, `db seed`, `generate`). Это
  главный подводный камень при связке serverless + managed Postgres, стоит сразу закладывать обе
  переменные.
- **Миграции:** `prisma migrate dev` локально генерирует файлы миграций (коммитятся в
  `prisma/migrations/`), `prisma migrate deploy` применяет их на проде. Для масштаба
  учебного проекта достаточно запускать `npx prisma migrate deploy` вручную со своей машины
  против прод-`DIRECT_URL` перед/после деплоя — CI не обязателен, но это естественный
  апгрейд на будущее (build-хук Vercel или маленький GitHub Action).
- **Сидирование:** `npx prisma db seed` запускается один раз на проде после первой миграции,
  чтобы загрузить `menu.json`. Не часть обычного деплоя; upsert делает повторные запуски
  безопасными.
- **Никакого состояния в локальной файловой системе:** фото товаров — только в
  Cloudinary/Supabase Storage, не в `public/uploads/` — у serverless-функций Vercel
  эфемерная/read-only файловая система, всё записанное локально пропадает между вызовами.
  `public/` — только для статичных, известных на этапе сборки ассетов (логотип, hero-картинка).
