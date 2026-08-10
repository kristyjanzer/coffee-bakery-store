---
name: skill-project
description: Use when building or extending any part of this store (pages, API routes, Prisma schema, cart, auth, admin panel) — defines what to build, in what order, and how it maps onto docs/architecture.md, docs/about-project.md and docs/technologies.md.
---

# Реализация проекта «Кофейня-пекарня»

- **Что должно быть в продукте** → [about-project.md](about-project.md)
- **Как это разложено по файлам/роутам/схеме БД** → [architecture.md](architecture.md)
- **Почему выбран именно такой стек** → [technologies.md](technologies.md)
- **Чек-лист безопасности** (открывать при auth/API/secrets) → [security-review.md](security-review.md)
- **Цвета/шрифты/отступы** (открывать при любой вёрстке) → [DESIGN.md](../DESIGN.md)
- **Темы правил агента** (server/style/mcp) → [AGENTS.md](../AGENTS.md) → `.agents/rules/*`

## Текущее состояние

Каркас проекта уже создан: `package.json` со всем стеком (Next 15, React 19, Prisma 5,
NextAuth 4, Zustand 5, Zod, Swiper, Font Awesome), конфиги (`tailwind.config.ts`,
`next.config.js`, `.eslintrc.json`, `tsconfig.json`), `app/layout.tsx` и заглушка
`app/page.tsx`. `prisma/schema.prisma` содержит только `generator`/`datasource` — модели ещё
не добавлены. Директорий `components/`, `lib/`, `stores/`, `types/`, `app/api/`, `app/admin/`
пока не существует.

## Порядок реализации

Каждый этап — законченный логический блок → после него коммит (см. AGENTS.md, Git Workflow).
Этапы идут снизу вверх: сначала данные, потом публичная часть, потом админка.

1. **Слой данных.** Дописать модели в `prisma/schema.prisma` по разделу 3 architecture.md
   (`Category`, `Product`, `Order`, `OrderItem`, `Customer`, `Review`, `AdminUser`) →
   `prisma migrate dev` → `lib/prisma.ts` (singleton через `globalThis.prisma`).
2. **Сидирование.** `prisma/seed.ts` читает `menu.json`, делает upsert категорий (с
   `sortOrder` по порядку файла) и товаров. Запускать через `npx prisma db seed`.
3. **Главная страница.** `app/page.tsx` — Server Component, читает категории и товары
   напрямую из Prisma (без `fetch` на свой `/api/*`). Верстается по about-project.md §1:
   хедер с навигацией → табы категорий → секции товаров (`ProductCard` с картинкой, весом,
   ценой, кнопкой `+` → степпер) → слайдер отзывов → футер.
4. **Компоненты layout.** `components/layout/{Header,Footer,Nav}` — навигация скроллит к
   секциям, футер со ссылками на соцсети/контакты.
5. **Корзина.** `stores/cartStore.ts` (zustand + `persist(localStorage)`, `skipHydration:
   true` из-за SSR-рассинхронизации — см. architecture.md §4) → `components/cart/{CartIcon,
   CartWidget,QtyStepper}`. `QtyStepper` переиспользуется на карточке товара, странице товара
   и в виджете.
6. **Страница товара.** `app/product/[id]/page.tsx` — Server Component, карточка на весь
   экран (изображение, состав, КБЖУ, вес, цена, кнопка «В корзину» + степпер) по
   about-project.md §2.
7. **Отзывы.** `/api/reviews` (GET, публично, только `isApproved`) + `ReviewsSlider`
   (Swiper/Embla, клиентский компонент).
8. **Оформление заявки.** `POST /api/orders`: валидация через zod-схему
   (`lib/validations/order.ts`), запись `Order`+`OrderItem[]` с снапшотами имени/цены, затем
   `lib/telegram.ts#notifyNewOrder()` в try/catch (сбой Telegram не должен ронять создание
   заказа). Без платёжной системы — `paymentStatus: "UNPAID"` по умолчанию.
9. **Авторизация администратора.** `lib/auth.ts` (NextAuth Credentials-провайдер,
   bcrypt-хэш пароля из `AdminUser`, JWT-сессии) → `app/api/auth/[...nextauth]/route.ts` →
   `middleware.ts` защищает `/admin/:path*`, кроме `/admin/login`. Каждый мутирующий
   API-роут (`POST/PATCH/DELETE /api/products`, `GET/PATCH /api/orders`) сам проверяет
   `getServerSession` — под matcher middleware не попадает.
10. **Админка — товары и заказы (ядро MVP).** `app/admin/products/*` (список, создание,
    редактирование — форма CRUD) и `app/admin/orders/*` (список с фильтром по статусу,
    карточка заказа, смена статуса) — см. about-project.md §«Страница административной
    панели», пункты 2–3.
11. **Админка — остальное.** Dashboard (сводка, график, топ товаров), Клиенты, Отзывы
    (модерация/ответ), Управление страницами (SEO, баннеры), Настройки (пользователи админки,
    уведомления) — в этом порядке приоритета, по мере необходимости.
12. **Хранение изображений.** `lib/storage.ts` — Cloudinary unsigned upload прямо из формы
    товара в админке, затем `PATCH /api/products/[id]` с полученным URL.
13. **Деплой.** Vercel (GitHub автодеплой) + Postgres на Neon/Supabase. Переменные окружения
    по `.env.example` (`DATABASE_URL` — pooled, `DIRECT_URL` — прямое соединение для миграций
    — не перепутать). `npx prisma migrate deploy` и `npx prisma db seed` — вручную, разово,
    после первой миграции на проде.

## Что открыть перед конкретным шагом

| Что делаешь | Что открыть |
|---|---|
| Роутинг, серверные/клиентские компоненты, env/секреты | `.agents/rules/server.md` |
| Любая правка TS/React/Tailwind | `.agents/rules/code-style.md` |
| Отладка в браузере, документация по библиотекам | `.agents/rules/mcp.md` |
| Auth, работа с input, secrets, новый API-роут | `docs/security-review.md` |
| Любая вёрстка (цвета, шрифты, отступы, радиусы) | `DESIGN.md` |

## Частые ошибки — не повторять

- Server Component ходит через `fetch()` на свой же `/api/*` вместо прямого чтения из Prisma —
  лишний сетевой хоп.
- `"use client"` ставится на весь блок/страницу вместо самого маленького листового компонента.
- Каталог, заказы или сессия дублируются в Zustand — там только состояние корзины.
- Секрет (Telegram-токен, DB URL) получает префикс `NEXT_PUBLIC_` или используется вне `lib/*`.
- Сидирование через `create` вместо `upsert` — повторный запуск падает или дублирует данные.
- `DATABASE_URL` (pooled) используется для миграций вместо `DIRECT_URL`.
- Новые скругления (`rounded-lg` и т.п.) добавляются «на глаз» — в DESIGN.md стиль почти без
  радиусов, это осознанный выбор.
- Прямая запись файлов (фото товаров) в `public/uploads/` — на Vercel serverless-функциях
  файловая система эфемерна; изображения только через Cloudinary/Supabase Storage.
