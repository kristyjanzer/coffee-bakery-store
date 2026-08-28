# Дизайн: закрытие хвоста пункта 35 — админка на Prisma

**Дата:** 2026-08-28
**Ветка:** `feature/admin-prisma-tail`
**Контекст:** перед пунктом 36 плана (security review + сквозное тестирование) проведён аудит
`docs/progress.md`. Все сознательно отложенные API/auth-задачи (пункты 27–33) закрыты в
задачах 53–68, но остался хвост пункта 35: разделы админки **Dashboard**, **Клиенты**,
**Управление страницами**, **Настройки** всё ещё работают на мок-данных
(`lib/dashboard.ts`, `lib/customers.ts` + `lib/orders.ts`, `lib/pages.ts`, `lib/settings.ts`),
а сквозной e2e-сценарий не доходит до шага 5 («заявка видна в списке заказов админки»).

Эта задача переводит перечисленное на Prisma и дописывает e2e-шаг 5.

## Границы (согласовано с пользователем)

- **Только персистентность админки.** Публичные страницы `/about`, `/contacts`, `/delivery`
  и вывод баннеров на главной — **вне охвата** (в плане их нет). Данные `SitePage`/`Banner`
  сохраняются в БД и редактируются в админке, но на витрине пока не читаются.
- Настройки уведомлений **сохраняются**, но `lib/telegram.ts` их по-прежнему не читает
  (реальная отправка email/SMS — не в этой задаче).
- График продаж на дашборде — **полный переключатель дни/недели/месяцы** (по ТЗ).
- `Customer` заполняется **при создании заказа** (upsert по телефону).
- В сид добавляется **фикстура демо-заказов** (~10–12), чтобы дашборд/клиенты не были пустыми.
- Разделы «Настройки» и «Управление страницами» — **только роль ADMIN**.
- Защита от самоблокировки: нельзя удалить/разжаловать последнего ADMIN.
- E2E-шаг 5 — **отдельный файл** `e2e/admin-order.spec.ts`.

## Изменения схемы Prisma

Четыре миграции (`prisma migrate dev`), по одной на логический блок.

### Новые модели

```prisma
// D — Управление страницами: три фиксированные страницы (about/contacts/delivery)
model SitePage {
  slug           String   @id            // "about" | "contacts" | "delivery"
  title          String
  content        String
  seoTitle       String
  seoDescription String
  updatedAt      DateTime @updatedAt
}

// D — баннеры/слайдер на главной
model Banner {
  id        Int      @id @default(autoincrement())
  imageUrl  String                        // "" допустимо (загрузка фото — пункт 34)
  title     String
  link      String
  isActive  Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
}

// E — настройки уведомлений: singleton-строка (id всегда 1)
model NotificationSettings {
  id                 Int      @id @default(1)
  notifyEmail        Boolean  @default(false)
  notifyEmailAddress String   @default("")
  notifySms          Boolean  @default(false)
  notifySmsPhone     String   @default("")
  updatedAt          DateTime @updatedAt
}
```

### Правка существующей связи

```prisma
model Order {
  // ...без изменений полей...
  customerId Int?
  customer   Customer? @relation(fields: [customerId], references: [id])   // ← добавляется
}

model Customer {
  // ...без изменений полей (phone @unique, email @unique уже есть)...
  orders Order[]                                                           // ← обратная сторона
}
```

### Список миграций

1. `add_customer_order_relation` — FK `Order.customerId → Customer.id`
2. `add_site_pages`
3. `add_banners`
4. `add_notification_settings`

`docs/architecture.md` раздел 3 — обновить все три модели + relation.

---

## Блок A — убрать мок заказов

**Проблема:** `lib/orders.ts` содержит `MOCK_ORDERS` (константный список ~10 заказов) и функции
`getOrders`/`getOrderById`/`getCustomerOrderHistory`/`updateOrderStatus`, которыми до сих пор
питаются Dashboard и «Клиенты». Их Prisma-версии давно живут в `lib/orderAdmin.ts`.

**Решение:**
- `lib/orders.ts` сжимается до:
  - `submitOrder()` — реальный `fetch("/api/orders")` (уже есть, не трогаем)
  - ре-экспорт `OrderStatus`/`ORDER_STATUSES`/`ORDER_STATUS_LABELS`/`PAYMENT_STATUS_LABELS`
    из `lib/orderStatus.ts` (уже есть)
- Удаляются: `MOCK_ORDERS`, `MOCK_ORDERS_INPUT`, `MockOrderInput`, `OrderRecord`,
  `getOrders`, `getOrderById`, `getCustomerOrderHistory`, `updateOrderStatus`.
- `lib/dashboard.ts` → переименовать в `lib/dashboardStats.ts` (отделить от удаляемого мока
  по имени, как `productCatalog` vs `products`).

**Конфликт с правилом «тесты существующего функционала не редактировать»:**
`lib/orders.test.ts` содержит describe-блоки `getOrders` / `getOrderById` /
`getCustomerOrderHistory` / `updateOrderStatus` — все на удаляемые мок-функции. Они удаляются
вместе с кодом. Блоки `submitOrder` и `ORDER_STATUSES` остаются нетронутыми. Прецедент —
задача 66 уже переписывала блок `submitOrder` в этом файле при смене его поведения. Фиксируется
как вынужденное исключение (удаление мёртвого кода, а не ослабление проверок).

---

## Блок B — дашборд на реальных агрегатах

**`lib/dashboardStats.ts`** — все функции Prisma-агрегаты по не-отменённым заказам
(`status ≠ CANCELLED`), сигнатуры совместимы с текущими (компонент почти не меняется):

| Функция | Реализация |
| --- | --- |
| `getDashboardSummary()` | `count` + `_sum.totalAmount` с фильтром `createdAt ≥ начало сегодня` и `≥ 7 дней назад`; средний чек = выручка / кол-во (0 при пустом) |
| `getSalesChart(range)` | `range: "days" \| "weeks" \| "months"`. `findMany({ where: { createdAt ≥ окно, status ≠ CANCELLED }, select: { createdAt, totalAmount } })`, группировка по бакету в JS. Окна: 7 дней / 8 недель / 6 месяцев. Возвращает прежнюю форму `SalesChartPoint { dayLabel, fullDate, revenue }` (имена полей не меняем — Dashboard.tsx их уже использует), но `dayLabel` теперь = «Пн» / «12–18.08» / «Авг» по `range` |
| `getTopProducts()` | `orderItem.groupBy({ by: ['productId'], _sum: { quantity }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 })` с `where: { order: { status: { not: 'CANCELLED' } } }`; имена — `product.findMany` по id |
| `getPendingOrders()` | `order.findMany({ where: { status: { in: ['NEW', 'IN_PROGRESS'] } }, orderBy: { createdAt: 'desc' }, take: 4 })` + состав |

**UI:**
- `app/pekarnya-control/(protected)/page.tsx` — читает `searchParams.range` (дефолт `"days"`),
  валидирует по белому списку, передаёт в `getSalesChart` и в `Dashboard`.
- `components/admin/SalesRangeTabs.tsx` — **новый** компонент, обычные `<Link>` с `?range=`
  (без клиентского JS, как табы в `/pekarnya-control/pages`). Три кнопки: Дни / Недели / Месяцы.
- `components/admin/Dashboard.tsx` — правки:
  - принимает `range: SalesRange`, рендерит `<SalesRangeTabs active={range} />` над графиком
  - «N мин назад» для заказов/уведомлений — через существующий `formatTimeAgo(createdAt)`
    (`lib/utils.ts`, задача 68) вместо мокового `minutesAgo`
  - классы-ступеньки высоты столбцов (`SALES_BAR_HEIGHT_STEPS` и т.п.) — не трогаются
  - тип `Review` для уведомлений импортируется из `lib/reviewsApi` (мок `lib/reviews.ts`
    уже type-only после задачи 67) — проверить, что импорт всё ещё валиден
- `PendingOrder`/`SalesChartPoint`/`TopProduct`/`DashboardSummary` — типы переезжают в
  `lib/dashboardStats.ts`, поля `minutesAgo` → `createdAt: Date`.

**Тесты:** `lib/dashboardStats.test.ts` — новый (мок `@/lib/prisma`), кейсы: пустая БД →
нули без деления на ноль; группировка по бакетам для каждого `range`; фильтр `CANCELLED`.

---

## Блок C — клиенты на таблице Customer

**`lib/orderCreation.ts` `createOrder()`** — оборачивается в `prisma.$transaction`:
1. `customer.upsert({ where: { phone: normalizedContact }, update: { name, email }, create: { name, phone, email } })`
2. `order.create({ data: { ..., customerId: customer.id } })`

Телефон нормализуется тем же способом, что уже применяется в валидаторе формы заказа
(`lib/validations/order.ts`) — свериться, привести к единому виду перед upsert (иначе один
человек с «+7 900...» и «8 900...» создаст двух клиентов).

**`lib/customers.ts`** — полностью на Prisma:
- `getCustomers()` — `customer.findMany` + для каждого агрегаты по `orders`:
  `_count`, сумма `totalAmount`, `max(createdAt)`. Сортировка — по дате последнего заказа
  (клиенты без заказов в конце). Форма `CustomerRecord` прежняя, `lastOrderMinutesAgo` →
  `lastOrderAt: Date \| null`.
- `getCustomerById(id)` — `customer.findUnique` + агрегаты.
- `CUSTOMER_CONTACT_INFO` (мок email/адресов) — удаляется. `deliveryAddress` — из
  `Customer.deliveryAddress` (пока всегда `null`, форма заказа адрес не собирает).

**`prisma/seed.ts` `backfillCustomers()`** — идемпотентный шаг: `order.findMany({ where: { customerId: null } })`
→ для каждого `customer.upsert` по контакту → `order.update({ customerId })`. Закрывает
исторические заказы на реальной Neon-БД пользователя. Безопасен при повторном запуске
(после первого прогона заказов с `customerId: null` не остаётся).

**Страницы:**
- `app/pekarnya-control/(protected)/customers/page.tsx` — источник `getCustomers()`,
  «последний заказ» через `formatTimeAgo`.
- `customers/[id]/page.tsx` — `getCustomerById`, история заказов = `order.findMany({ where: { customerId } })`
  (не фильтр по `customerContact`), «когда» через `formatTimeAgo`.

**Тесты:** `lib/customers.test.ts` — новый (мок `@/lib/prisma`); `lib/orderCreation.test.ts` —
дополнить кейсом «создание заказа делает upsert Customer и проставляет customerId»
(существующие кейсы не трогать).

---

## Блок D — управление страницами на Prisma

**`lib/pages.ts`** — на Prisma:
- `getSitePages()` / `getSitePageBySlug(slug)` — `sitePage.findMany` / `findUnique`
- `getBanners()` — `banner.findMany({ orderBy: { sortOrder: 'asc' } })`
- заглушки `updateSitePage` / `saveBanners` — **удаляются** (переезжают в клиентский helper)
- типы `PageSlug` / `SitePage` / `Banner` / `SitePageInput` / `BannerInput` — остаются

**`lib/pageAdminApi.ts`** — **новый** клиентский helper (по образцу `productAdminApi.ts`):
- `updateSitePage(slug, input)` → `PATCH /api/pages/[slug]` → `{ ok } | { ok: false, error }`
- `saveBanners(banners)` → `PUT /api/banners`

**API-роуты** (`requireAdminSession(["ADMIN"])`):
- `app/api/pages/[slug]/route.ts` — `PATCH`: 400 если `slug ∉ {about, contacts, delivery}`,
  zod-валидация тела, `sitePage.update`, 404 если строки нет (не должно быть — сид создаёт).
- `app/api/banners/route.ts` — `PUT`: zod-массив. Замена всего списка в транзакции:
  `banner.deleteMany({})` → `banner.createMany` с `sortOrder` по индексу массива. id баннеров
  ни на что не ссылаются — пересоздание безопасно. (`GET` не нужен — витрина баннеры не читает,
  админка читает через Server Component напрямую.)

**Валидация:** `lib/validations/page.ts` (`sitePageInputSchema`: `title`/`content`/`seoTitle`/
`seoDescription` — непустые строки с разумными лимитами длины), `lib/validations/banner.ts`
(`bannerListSchema`: массив, `imageUrl` — строка (может быть `""`), `title`/`link` — непустые,
`isActive` — bool).

**Компоненты:**
- `components/admin/PageContentForm.tsx` — вызывает `pageAdminApi.updateSitePage`, показывает
  ошибку сервера под кнопкой, `router.refresh()` после успеха, текст «Сохранено (заглушка)» →
  «Сохранено».
- `components/admin/BannerManager.tsx` — то же через `pageAdminApi.saveBanners`.

**Сид:**
- `seedSitePages()` — `upsert` трёх фиксированных страниц (тексты-плейсхолдеры берутся из
  текущего мока `lib/pages.ts` до его переписывания).
- `seedBanners()` — 2 демо-баннера, **только если `banner.count() === 0`** (не перетирать
  правки пользователя при повторном сиде).

**Тесты:** `lib/pages.test.ts`, `app/api/pages/[slug]/route.test.ts`,
`app/api/banners/route.test.ts` (мок `@/lib/prisma` / `@/lib/auth`).

---

## Блок E — настройки на Prisma

**`lib/settings.ts`** — на Prisma:
- `getAdminUsers()` — `adminUser.findMany({ select: { id, email, role } })` (без `passwordHash`)
- `getNotificationSettings()` — `notificationSettings.upsert({ where: { id: 1 }, update: {}, create: {} })`
  (создаёт дефолтную строку при первом чтении)
- `createAdminUser(input)` — bcrypt-хэш пароля (`bcryptjs`, как в `seed.ts` / `lib/auth.ts`),
  `adminUser.create`; бросает/возвращает ошибку при занятом email
- заглушки `updateAdminUserRole` / `deleteAdminUser` / `updateNotificationSettings` — логика
  переезжает в роуты, клиентские вызовы — в helper
- константы `ADMIN_ROLES` / `ADMIN_ROLE_LABELS`, типы — остаются

**`lib/settingsAdminApi.ts`** — **новый** клиентский helper:
- `createAdminUser(input)` → `POST /api/admin-users`
- `updateAdminUserRole(id, role)` → `PATCH /api/admin-users/[id]`
- `deleteAdminUser(id)` → `DELETE /api/admin-users/[id]`
- `updateNotificationSettings(input)` → `PUT /api/settings/notifications`

**API-роуты** (`requireAdminSession(["ADMIN"])`):
- `app/api/admin-users/route.ts`
  - `GET` — список (id/email/role)
  - `POST` — zod (`email`, `password` мин. 8, `role ∈ AdminRole`); 409 если email уже есть;
    201 при успехе
- `app/api/admin-users/[id]/route.ts`
  - `PATCH` — только `{ role }`. **Guard последнего ADMIN:** если новая роль ≠ ADMIN и цель —
    единственный пользователь с ролью ADMIN (`adminUser.count({ where: { role: 'ADMIN' } }) <= 1`
    и цель имеет роль ADMIN) → 409.
  - `DELETE` — 409 если цель единственный ADMIN; 409/403 если цель — текущий пользователь
    (сверка `id` → `email` с `session.user.email`); 204 при успехе
- `app/api/settings/notifications/route.ts`
  - `PUT` — zod, `notificationSettings.upsert({ where: { id: 1 } })`

**Валидация:** `lib/validations/adminUser.ts` (`createAdminUserSchema`, `updateAdminUserRoleSchema`),
`lib/validations/notificationSettings.ts` (`notificationSettingsSchema`).

**Компоненты:**
- `components/admin/AdminUsersManager.tsx` — реальный API через `settingsAdminApi`, показ
  ошибок сервера (в т.ч. 409 «последний администратор»), `router.refresh()` после мутаций.
- `components/admin/NotificationSettingsForm.tsx` — то же, текст «Сохранено (заглушка)» →
  «Сохранено».

**Доступ ADMIN-only к `/settings` и `/pages`:**
- Новый route group `app/pekarnya-control/(protected)/(admin-only)/` с `layout.tsx`:
  `getServerSession` → `redirect("/pekarnya-control")` если `session.user.role !== "ADMIN"`.
- Папки `settings/` и `pages/` **переносятся** в этот route group. URL не меняются
  (`(admin-only)` — group в скобках).
- `components/admin/Sidebar.tsx` — пункты «Управление страницами» и «Настройки» скрываются
  для `ORDER_MANAGER` через `useSession().data?.user.role` (Sidebar уже клиентский —
  проверить; если серверный, прокинуть роль пропом из layout).

**Сид:**
- `seedAdminUser()` — уже есть (первый ADMIN из env). Добавить опциональный второй
  пользователь-`ORDER_MANAGER` из `SEED_MANAGER_EMAIL`/`SEED_MANAGER_PASSWORD`, если заданы
  (пропускается молча — чтобы было на ком проверять роль-гейт, но без обязаловки).
- `seedNotificationSettings()` — не нужен, `getNotificationSettings()` создаёт строку сам.

**Тесты:** `lib/settings.test.ts`, `app/api/admin-users/route.test.ts`,
`app/api/admin-users/[id]/route.test.ts` (обязательно кейс «нельзя удалить/разжаловать
последнего ADMIN»), `app/api/settings/notifications/route.test.ts`.

---

## Блок F — e2e шаг 5

**`e2e/admin-order.spec.ts`** — **новый** файл:
1. Создать заказ через UI (шаги 1–4 из `checkout-flow.spec.ts`; имя клиента с `Date.now()`
   для уникальности прогонов).
2. Перейти на `/pekarnya-control/login`, войти как ADMIN (тестовые креды из env).
3. `/pekarnya-control/orders` — найти строку заказа по имени клиента / сумме.
4. Открыть карточку заказа — проверить состав и сумму.

**`e2e/checkout-flow.spec.ts`** — правится **только** устаревший комментарий (строки 3–7:
`submitOrder()` давно не заглушка, `/pekarnya-control/*` под `proxy.ts`). Логика теста
не трогается.

**CI (`.github/workflows/ci.yml`)** — в job `e2e`, блок `env:`, добавить:
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — тестовые значения прямо в workflow (одноразовая
  контейнерная БД, не секрет)
- `NEXTAUTH_SECRET` — тестовое значение (NextAuth без него не поднимет JWT-сессии)
- `NEXTAUTH_URL: http://localhost:3000`

`prisma db seed` в job уже вызывается — подхватит `seedSitePages`/`seedBanners`/демо-заказы.

`.env.example` — пометить, что `ADMIN_EMAIL`/`ADMIN_PASSWORD` нужны и для e2e.

---

## Сид — итоговый порядок (`prisma/seed.ts`)

```
seedCatalog        (есть)
seedReviews        (есть)
seedAdminUser      (есть; + опциональный ORDER_MANAGER)
seedSitePages      (новый)
seedBanners        (новый, только если пусто)
seedOrders         (новый, демо ~10–12 через upsert по фиксированным id)
backfillCustomers  (новый, идемпотентный)
```

`seedOrders` — по образцу удаляемого `MOCK_ORDERS_INPUT` из `lib/orders.ts`: разные статусы,
разные клиенты (часть — по несколько заказов, для «истории клиента»), `createdAt` разбросан
по последним ~30 дням (чтобы график недель/месяцев был не пустой). Товары — реальные id из
`menu.json`. Идемпотентно: `order.upsert` по фиксированным id + `setval` на sequence.

---

## Документация

- `docs/architecture.md` — раздел 3 (модели + relation), раздел 7 (ADMIN-only разделы),
  дерево файлов (`(admin-only)` group, новые роуты/lib)
- `docs/plan.md` — пункты 15/18/20/21 отметить как доведённые до Prisma (хвост пункта 35 закрыт)
- `docs/progress.md` — по записи на блок (правило: 2–3 строки, файлы + суть + новые env)
- `.env.example` — `SEED_MANAGER_EMAIL`/`SEED_MANAGER_PASSWORD` (опционально), пометка про e2e

---

## Порядок реализации (атомарные коммиты)

| Шаг | Блок | Коммит |
| --- | --- | --- |
| 1 | Схема + 4 миграции + architecture.md §3 | `feat(db): модели SitePage/Banner/NotificationSettings + связь Order↔Customer` |
| 2 | C | `feat(admin): раздел «Клиенты» на таблице Customer` |
| 3 | A + B | `feat(admin): дашборд на реальных агрегатах, убран мок заказов` |
| 4 | D | `feat(admin): управление страницами пишет в БД` |
| 5 | E | `feat(admin): настройки и пользователи админки в БД, ADMIN-only разделы` |
| 6 | F | `test(e2e): заявка видна в админке после входа` |
| 7 | доки | `docs: закрыть хвост пункта 35` |

Каждый шаг перед коммитом: `npx vitest run` + `npm run lint` + `npx tsc --noEmit` — зелёные.
По ходу — ручная проверка против реальной Neon-БД (как в задачах 53–68). Миграции
применяются к БД пользователя по мере готовности.

**Security review** (`.claude/skills/security-review`) — после шага 6, до финального отчёта:
особое внимание — все новые мутирующие роуты за `requireAdminSession`, guard последнего ADMIN,
пароль нового админа только bcrypt-хэшем, `passwordHash` не уходит в ответы API.

## Оценка объёма новых файлов

- ~7 API-роутов (`pages/[slug]`, `banners`, `admin-users`, `admin-users/[id]`,
  `settings/notifications`)
- ~4 lib-helper (`pageAdminApi`, `settingsAdminApi`) + переписанные `pages`/`settings`/
  `customers`/`dashboardStats`
- ~5 validation-схем
- 1 UI-компонент (`SalesRangeTabs`) + 1 route-group layout (`(admin-only)`)
- ~10 тест-файлов
