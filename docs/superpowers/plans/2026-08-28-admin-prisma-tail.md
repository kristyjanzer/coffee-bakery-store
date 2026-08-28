# Админка на Prisma (хвост пункта 35) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** перевести разделы админки Dashboard / Клиенты / Управление страницами / Настройки с мок-данных на Prisma и дописать e2e-шаг «заявка видна в списке заказов админки».

**Architecture:** три новые модели Prisma (`SitePage`, `Banner`, `NotificationSettings`) + реальная связь `Order ↔ Customer`. Мутации из клиентских компонентов идут через новые `/api/*` роуты за `requireAdminSession`; Server Components админки читают Prisma напрямую. `createOrder()` в транзакции делает upsert `Customer`. Демо-данные (заказы, страницы, баннеры) — в `prisma/seed.ts`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Prisma 7 (driver adapters, `@/generated/prisma/client`), NextAuth 4, Zod, Vitest + React Testing Library, Playwright.

**Spec:** [docs/superpowers/specs/2026-08-28-admin-prisma-tail-design.md](../specs/2026-08-28-admin-prisma-tail-design.md)

## Global Constraints

- Ветка: `feature/admin-prisma-tail` (уже создана от `main`, содержит только коммит спеки).
- TypeScript strict, алиас `@/*` → `./*`. Prisma-клиент импортируется из `@/generated/prisma/client`, рантайм — из `@/lib/prisma` (`prisma`).
- Каждый шаг перед коммитом: `npx vitest run` + `npm run lint` + `npx tsc --noEmit` — всё зелёное.
- Тесты существующего функционала **не редактируются**. Единственное согласованное исключение — удаление describe-блоков `getOrders`/`getOrderById`/`getCustomerOrderHistory`/`updateOrderStatus` в `lib/orders.test.ts` (код, который они проверяют, удаляется; прецедент — задача 66).
- Дизайн-токены только из `DESIGN.md` (тёмная тема), скруглений почти нет (`rounded-sm` максимум). Inline `style={{}}` запрещён ESLint — классы Tailwind только литеральными строками в `components/**`.
- Секреты только через `process.env` на сервере, без `NEXT_PUBLIC_`.
- Роль `ADMIN` — полный доступ; `ORDER_MANAGER` — заказы/дашборд/клиенты/товары(чтение)/отзывы, но **не** Настройки и не Управление страницами.
- Коммиты: заголовок в стиле проекта (`feat(admin): …`), в конце тела `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Миграции создаются через `npm run prisma:migrate -- --name <name>` (в проекте это `prisma migrate dev && prisma generate`, схема/URL — из `prisma.config.ts`, читает `DIRECT_URL`). Применяются к реальной Neon-БД пользователя по ходу.

---

## Обзор структуры файлов

**Новые модели** — `prisma/schema.prisma` (+ 4 миграции в `prisma/migrations/`).

**lib/ — переписываются на Prisma:**
- `lib/dashboard.ts` → **переименовать** в `lib/dashboardStats.ts` (агрегаты по заказам)
- `lib/customers.ts` (findMany + агрегаты)
- `lib/pages.ts` (findMany/findUnique; заглушки удаляются)
- `lib/settings.ts` (findMany; bcrypt для create; заглушки удаляются)
- `lib/orders.ts` (сжимается до `submitOrder` + ре-экспорт констант)
- `lib/orderCreation.ts` (транзакция + upsert Customer)
- `lib/auth.ts` (`requireAdminSession` дополнительно возвращает `email`)

**lib/ — новые клиентские helpers (fetch к /api/*):**
- `lib/pageAdminApi.ts`
- `lib/settingsAdminApi.ts`

**lib/validations/ — новые схемы:**
- `lib/validations/page.ts`, `lib/validations/banner.ts`
- `lib/validations/adminUser.ts`, `lib/validations/notificationSettings.ts`

**app/api/ — новые роуты:**
- `app/api/pages/[slug]/route.ts` (PATCH)
- `app/api/banners/route.ts` (PUT)
- `app/api/admin-users/route.ts` (GET, POST)
- `app/api/admin-users/[id]/route.ts` (PATCH, DELETE)
- `app/api/settings/notifications/route.ts` (PUT)

**app/pekarnya-control/ — правки страниц + новый route group:**
- `(protected)/(admin-only)/layout.tsx` — новый, ADMIN-only гейт
- переносятся: `(protected)/pages/` → `(protected)/(admin-only)/pages/`, `(protected)/settings/` → `(protected)/(admin-only)/settings/`
- правятся: `(protected)/page.tsx` (dashboard, `?range=`), `(protected)/customers/page.tsx`, `(protected)/customers/[id]/page.tsx`

**components/admin/ — правки + 1 новый:**
- `SalesRangeTabs.tsx` — новый
- правятся: `Dashboard.tsx`, `PageContentForm.tsx`, `BannerManager.tsx`, `AdminUsersManager.tsx`, `NotificationSettingsForm.tsx`, `Sidebar.tsx`

**prisma/seed.ts** — новые шаги `seedSitePages`, `seedBanners`, `seedOrders`, `backfillCustomers`, опциональный второй админ.

**e2e/** — новый `e2e/admin-order.spec.ts`; правка комментария в `e2e/checkout-flow.spec.ts`.

**CI** — `.github/workflows/ci.yml` (env для e2e).

**Доки** — `docs/architecture.md`, `docs/plan.md`, `docs/progress.md`, `.env.example`.

---

## Task 1: Схема Prisma — новые модели и связь Order↔Customer

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<ts>_add_customer_order_relation/migration.sql` (генерится)
- Create: `prisma/migrations/<ts>_add_site_pages/migration.sql` (генерится)
- Create: `prisma/migrations/<ts>_add_banners/migration.sql` (генерится)
- Create: `prisma/migrations/<ts>_add_notification_settings/migration.sql` (генерится)
- Modify: `docs/architecture.md` (раздел 3)

**Interfaces:**
- Produces: Prisma-модели `SitePage { slug, title, content, seoTitle, seoDescription, updatedAt }`, `Banner { id, imageUrl, title, link, isActive, sortOrder, createdAt }`, `NotificationSettings { id, notifyEmail, notifyEmailAddress, notifySms, notifySmsPhone, updatedAt }`, поле `Order.customerId` с relation `Order.customer` / `Customer.orders`.

- [ ] **Step 1: Добавить relation Order↔Customer в схему**

В `prisma/schema.prisma`, модель `Order` — заменить строку `customerId Int? // задел на будущее — связь с Customer` на:

```prisma
  customerId         Int?
  customer           Customer?   @relation(fields: [customerId], references: [id])
```

В модель `Customer` добавить обратную сторону (перед `createdAt`):

```prisma
  orders          Order[]
```

- [ ] **Step 2: Добавить три новые модели**

В конце `prisma/schema.prisma` (после `enum AdminRole`):

```prisma
// --- Управление страницами (docs/plan.md, пункт 20) ---

model SitePage {
  slug           String   @id // "about" | "contacts" | "delivery"
  title          String
  content        String
  seoTitle       String
  seoDescription String
  updatedAt      DateTime @updatedAt
}

model Banner {
  id        Int      @id @default(autoincrement())
  imageUrl  String // "" допустимо (загрузка фото — пункт 34)
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

- [ ] **Step 3: Проверить валидность схемы**

Run: `npx prisma validate`
Expected: `The schema at prisma\schema.prisma is valid 🚀`

- [ ] **Step 4: Создать миграцию для связи Order↔Customer**

Run: `npm run prisma:migrate -- --name add_customer_order_relation`
Expected: миграция создана и применена к БД, `prisma generate` отработал. `prisma migrate status` — «Database schema is up to date».

- [ ] **Step 5: Создать миграции для новых моделей**

Run по очереди:
- `npm run prisma:migrate -- --name add_site_pages`
- `npm run prisma:migrate -- --name add_banners`
- `npm run prisma:migrate -- --name add_notification_settings`

(Prisma сам разложит по отдельным папкам; если объединит `add_site_pages` — не страшно, тогда переименуй `--name add_site_pages_banners_notifications` одной миграцией.)

Expected: три (или одна объединённая) миграции применены, `prisma migrate status` чист.

- [ ] **Step 6: Прогнать проверки**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: всё зелёное (сгенерированный клиент содержит новые типы; существующие тесты не затронуты).

- [ ] **Step 7: Обновить `docs/architecture.md` раздел 3**

В блоке ```prisma``` раздела 3: в `model Order` заменить `customerId Int? // задел на будущее — связь с Customer` на пару `customerId` + `customer Customer? @relation(...)`; в `model Customer` добавить `orders Order[]`; убрать из комментария «заделы под будущее» упоминание, что Customer не используется; добавить три новые модели (`SitePage`, `Banner`, `NotificationSettings`) с тем же текстом, что в схеме. В прозе после блока — одно предложение: «`Customer` заполняется при создании заказа (upsert по телефону); `SitePage`/`Banner`/`NotificationSettings` редактируются в админке (пункты 20–21), на витрине пока не читаются».

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations docs/architecture.md
git commit -m "feat(db): модели SitePage/Banner/NotificationSettings + связь Order↔Customer

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Блок C — раздел «Клиенты» на таблице Customer

**Files:**
- Modify: `lib/orderCreation.ts`
- Modify: `lib/validations/order.ts` (вынести нормализацию телефона в экспортируемую функцию)
- Rewrite: `lib/customers.ts`
- Modify: `prisma/seed.ts` (добавить `backfillCustomers()`)
- Modify: `app/pekarnya-control/(protected)/customers/page.tsx`
- Modify: `app/pekarnya-control/(protected)/customers/[id]/page.tsx`
- Test: `lib/customers.test.ts` (новый), `lib/orderCreation.test.ts` (дополнить)

**Interfaces:**
- Consumes: `prisma` из `@/lib/prisma`; `CreateOrderInput` из `@/lib/validations/order`.
- Produces:
  - `normalizePhone(raw: string): string` в `lib/validations/order.ts` — приводит телефон к `+7XXXXXXXXXX` (11 цифр, ведущая 8→7).
  - `lib/customers.ts`: `getCustomers(): Promise<CustomerRecord[]>`, `getCustomerById(id: number): Promise<CustomerRecord | null>`; `CustomerRecord { id, name, phone, email, deliveryAddress, ordersCount, totalSpent, lastOrderAt: Date | null }`.
  - `createOrder()` теперь дополнительно делает upsert `Customer` и проставляет `Order.customerId`.

- [ ] **Step 1: Вынести нормализацию телефона (failing test)**

В `lib/validations/order.test.ts` — **не редактировать существующее**, создать отдельный файл `lib/phone.test.ts`? Нет — нормализация логически часть order-валидации. Вместо этого создать `lib/validations/order.test.ts` нельзя (существует). Создать новый `lib/validations/phone.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/validations/order";

describe("normalizePhone", () => {
  it("приводит 8-начальный номер к +7", () => {
    expect(normalizePhone("8 (900) 123-45-67")).toBe("+79001234567");
  });
  it("приводит +7 и 7 к единому виду", () => {
    expect(normalizePhone("+7 900 123 45 67")).toBe("+79001234567");
    expect(normalizePhone("79001234567")).toBe("+79001234567");
  });
  it("оставляет как есть строку без 11 цифр (валидатор формы уже отсёк)", () => {
    expect(normalizePhone("123")).toBe("+7123");
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npx vitest run lib/validations/phone.test.ts`
Expected: FAIL — `normalizePhone` не экспортируется.

- [ ] **Step 3: Реализовать `normalizePhone`**

В `lib/validations/order.ts` добавить экспорт (рядом с схемами):

```ts
// Телефон к единому виду +7XXXXXXXXXX: только цифры, ведущая 8 → 7, префикс +.
// Нужно, чтобы один человек с "+7 900…" и "8 900…" не создал двух Customer.
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  }
  return `+${digits}`;
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npx vitest run lib/validations/phone.test.ts`
Expected: PASS.

- [ ] **Step 5: createOrder делает upsert Customer (failing test)**

Дополнить `lib/orderCreation.test.ts` — **существующие кейсы не трогать**, добавить в конец файла новый `describe`. Сначала посмотреть текущие моки в файле (там мокается `@/lib/prisma`); добавить в мок `customer: { upsert: ... }` и `$transaction`. Пример нового блока (адаптировать под фактическую структуру моков файла):

```ts
describe("createOrder — связь с Customer", () => {
  it("делает upsert Customer по нормализованному телефону и проставляет customerId", async () => {
    // productFindManyMock → валидный товар; customerUpsertMock → { id: 7 };
    // orderCreateMock → { id: 100 }; $transaction прогоняет колбэк с mock-клиентом.
    // Ожидания:
    expect(customerUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone: "+79001234567" },
        update: expect.objectContaining({ name: "Тест", email: "t@e.com" }),
        create: expect.objectContaining({ phone: "+79001234567", name: "Тест", email: "t@e.com" }),
      })
    );
    expect(orderCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ customerId: 7 }) })
    );
  });
});
```

- [ ] **Step 6: Run — verify fail**

Run: `npx vitest run lib/orderCreation.test.ts`
Expected: FAIL — `customerId` не передаётся, `customer.upsert` не вызывается.

- [ ] **Step 7: Реализовать upsert в `createOrder`**

В `lib/orderCreation.ts`: импортировать `normalizePhone`. Обернуть создание в `prisma.$transaction`:

```ts
import { prisma } from "@/lib/prisma";
import { normalizePhone, type CreateOrderInput } from "@/lib/validations/order";

export type CreateOrderResult = { ok: true; orderId: number } | { ok: false; error: string };

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const productIds = input.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  for (const item of input.items) {
    const product = productById.get(item.productId);
    if (!product) return { ok: false, error: `Товар #${item.productId} недоступен` };
    if (product.stockQuantity !== null && item.quantity > product.stockQuantity) {
      return { ok: false, error: `«${product.name}»: доступно только ${product.stockQuantity} шт.` };
    }
  }

  const orderItems = input.items.map((item) => {
    const product = productById.get(item.productId)!;
    return {
      productId: product.id,
      productNameSnapshot: product.name,
      priceSnapshot: product.price,
      quantity: item.quantity,
    };
  });
  const totalAmount = orderItems.reduce((sum, i) => sum + i.priceSnapshot * i.quantity, 0);
  const phone = normalizePhone(input.customerContact);

  const order = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { phone },
      update: { name: input.customerName, email: input.email },
      create: { name: input.customerName, phone, email: input.email },
    });
    return tx.order.create({
      data: {
        customerName: input.customerName,
        customerContact: input.customerContact,
        customerEmail: input.email,
        comment: input.comment || null,
        preferredDate: input.preferredDate ? new Date(input.preferredDate) : null,
        totalAmount,
        customerId: customer.id,
        items: { create: orderItems },
      },
      select: { id: true },
    });
  });

  return { ok: true, orderId: order.id };
}
```

- [ ] **Step 8: Run — verify pass**

Run: `npx vitest run lib/orderCreation.test.ts`
Expected: PASS (и старые кейсы, и новый). Если старые кейсы падают из-за `$transaction` — поправить мок `@/lib/prisma` в этом тесте так, чтобы `$transaction` вызывал переданный колбэк с объектом, где `customer.upsert`/`order.create` — те же моки (это правка мок-инфраструктуры теста под новый код, не ослабление проверок).

- [ ] **Step 9: Переписать `lib/customers.ts` на Prisma (failing test)**

Создать `lib/customers.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const findManyMock = vi.hoisted(() => vi.fn());
const findUniqueMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { customer: { findMany: findManyMock, findUnique: findUniqueMock } },
}));

beforeEach(() => {
  findManyMock.mockReset();
  findUniqueMock.mockReset();
});

const row = {
  id: 3,
  name: "Анна",
  phone: "+79001234501",
  email: "anna@e.com",
  deliveryAddress: null,
  orders: [
    { totalAmount: 500, createdAt: new Date("2026-08-20T10:00:00Z") },
    { totalAmount: 300, createdAt: new Date("2026-08-25T10:00:00Z") },
  ],
};

describe("getCustomers", () => {
  it("считает кол-во заказов, сумму и дату последнего", async () => {
    findManyMock.mockResolvedValueOnce([row]);
    const { getCustomers } = await import("@/lib/customers");
    const [c] = await getCustomers();
    expect(c).toMatchObject({
      id: 3,
      name: "Анна",
      ordersCount: 2,
      totalSpent: 800,
      lastOrderAt: new Date("2026-08-25T10:00:00Z"),
    });
  });

  it("клиент без заказов — нули и lastOrderAt null", async () => {
    findManyMock.mockResolvedValueOnce([{ ...row, orders: [] }]);
    const { getCustomers } = await import("@/lib/customers");
    const [c] = await getCustomers();
    expect(c).toMatchObject({ ordersCount: 0, totalSpent: 0, lastOrderAt: null });
  });
});

describe("getCustomerById", () => {
  it("возвращает null, если клиента нет", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const { getCustomerById } = await import("@/lib/customers");
    expect(await getCustomerById(999)).toBeNull();
  });
});
```

- [ ] **Step 10: Run — verify fail**

Run: `npx vitest run lib/customers.test.ts`
Expected: FAIL — старый `lib/customers.ts` импортирует `@/lib/orders` и не мокнутый prisma.

- [ ] **Step 11: Реализовать новый `lib/customers.ts`**

Полностью заменить содержимое:

```ts
import { prisma } from "@/lib/prisma";

// Раздел админки «Клиенты» (docs/plan.md, пункт 18; about-project.md). Источник —
// таблица Customer (заполняется в createOrder, lib/orderCreation.ts, upsert по
// телефону) + агрегаты по её заказам.
export interface CustomerRecord {
  id: number;
  name: string;
  phone: string;
  email: string;
  deliveryAddress: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: Date | null;
}

const customerSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  deliveryAddress: true,
  orders: { select: { totalAmount: true, createdAt: true } },
} as const;

type CustomerRow = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  deliveryAddress: string | null;
  orders: { totalAmount: number; createdAt: Date }[];
};

function toRecord(row: CustomerRow): CustomerRecord {
  const lastOrderAt = row.orders.reduce<Date | null>(
    (latest, o) => (!latest || o.createdAt > latest ? o.createdAt : latest),
    null
  );
  return {
    id: row.id,
    name: row.name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    deliveryAddress: row.deliveryAddress ?? "",
    ordersCount: row.orders.length,
    totalSpent: row.orders.reduce((sum, o) => sum + o.totalAmount, 0),
    lastOrderAt,
  };
}

export async function getCustomers(): Promise<CustomerRecord[]> {
  const rows = (await prisma.customer.findMany({ select: customerSelect })) as CustomerRow[];
  return rows
    .map(toRecord)
    .sort((a, b) => (b.lastOrderAt?.getTime() ?? 0) - (a.lastOrderAt?.getTime() ?? 0));
}

export async function getCustomerById(id: number): Promise<CustomerRecord | null> {
  const row = (await prisma.customer.findUnique({
    where: { id },
    select: customerSelect,
  })) as CustomerRow | null;
  return row ? toRecord(row) : null;
}
```

- [ ] **Step 12: Run — verify pass**

Run: `npx vitest run lib/customers.test.ts`
Expected: PASS.

- [ ] **Step 13: Обновить страницу списка клиентов**

`app/pekarnya-control/(protected)/customers/page.tsx`:
- импорт `formatTimeAgo` из `@/lib/utils` (уже есть `formatPrice`)
- ячейка «Последний заказ»: `{customer.lastOrderAt ? formatTimeAgo(customer.lastOrderAt) : "—"}` вместо `{customer.lastOrderMinutesAgo} мин назад`
- остальное без изменений (поля `name/phone/email/ordersCount/totalSpent` те же)

- [ ] **Step 14: Обновить карточку клиента**

`app/pekarnya-control/(protected)/customers/[id]/page.tsx`:
- `getCustomerById` теперь возвращает `null` (не `undefined`) — условие `if (!customer) notFound();` уже корректно
- историю заказов брать не через `getOrders()` из `@/lib/orders`, а через `@/lib/orderAdmin`:
  ```ts
  import { getOrders } from "@/lib/orderAdmin";
  import { ORDER_STATUS_LABELS } from "@/lib/orderStatus";
  // ...
  const allOrders = await getOrders();
  const orders = allOrders.filter((o) => o.items.length > 0 && /* принадлежит клиенту */);
  ```
  Лучше — добавить в `lib/orderAdmin.ts` функцию `getOrdersByCustomerId(customerId: number)` (аналог существующей `getCustomerOrderHistory`, но по `customerId`). Добавить её и мини-тест в `lib/orderAdmin.test.ts` (новый `describe`, существующие не трогать).
- поля строки заказа: `order.items` → `item.productNameSnapshot` (не `item.name`), `order.createdAt` → `formatTimeAgo`, `order.status` через `ORDER_STATUS_LABELS`

- [ ] **Step 15: `getOrdersByCustomerId` (failing test → impl → pass)**

В `lib/orderAdmin.test.ts` добавить `describe("getOrdersByCustomerId")` с проверкой `where: { customerId }`, `orderBy: { createdAt: "desc" }`. Реализовать в `lib/orderAdmin.ts`:

```ts
export async function getOrdersByCustomerId(customerId: number): Promise<AdminOrder[]> {
  return prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    select: adminOrderSelect,
  });
}
```

Run: `npx vitest run lib/orderAdmin.test.ts` — PASS.

- [ ] **Step 16: `backfillCustomers()` в seed**

В `prisma/seed.ts` добавить функцию и вызвать её последней в `main()` (после `seedAdminUser`, до/после `seedReviews` — порядок финализируется в Task 7, пока просто в конец):

```ts
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
```

Импортировать `normalizePhone` из `@/lib/validations/order` в seed.

- [ ] **Step 17: Прогнать всё + ручная проверка**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: зелёное.

Ручная проверка против Neon: `npx prisma db seed` (backfill привяжет существующие заказы, если есть) → залогиниться в админку → `/pekarnya-control/customers` показывает клиентов из таблицы, суммы совпадают; карточка клиента открывает историю заказов.

- [ ] **Step 18: Commit**

```bash
git add lib/ app/pekarnya-control/\(protected\)/customers prisma/seed.ts
git commit -m "feat(admin): раздел «Клиенты» на таблице Customer

createOrder() в транзакции делает upsert Customer по нормализованному телефону
и проставляет Order.customerId. lib/customers.ts читает Customer + агрегаты по
заказам. backfillCustomers() в сиде привязывает исторические заказы.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Блок A+B — дашборд на реальных агрегатах, убрать мок заказов

**Files:**
- Delete logic from: `lib/orders.ts` (оставить `submitOrder` + ре-экспорт констант)
- Rename+rewrite: `lib/dashboard.ts` → `lib/dashboardStats.ts`
- Create: `components/admin/SalesRangeTabs.tsx`
- Modify: `components/admin/Dashboard.tsx`
- Modify: `app/pekarnya-control/(protected)/page.tsx`
- Modify: `lib/orders.test.ts` (удалить 4 describe-блока — согласованное исключение)
- Test: `lib/dashboardStats.test.ts` (новый)

**Interfaces:**
- Consumes: `prisma` из `@/lib/prisma`; `formatTimeAgo` из `@/lib/utils`; `OrderStatus` из `@/generated/prisma/client`.
- Produces:
  - `lib/orders.ts` экспортирует только: `submitOrder`, `SubmitOrderPayload`, `SubmitOrderResult` + ре-экспорт `OrderStatus`, `ORDER_STATUSES`, `ORDER_STATUS_LABELS`, `PaymentStatus`, `PAYMENT_STATUS_LABELS` из `@/lib/orderStatus`.
  - `lib/dashboardStats.ts`: `SalesRange = "days" | "weeks" | "months"`; `SALES_RANGES: SalesRange[]`; `getDashboardSummary()`, `getSalesChart(range: SalesRange)`, `getTopProducts()`, `getPendingOrders()`. Типы `DashboardSummary`, `SalesChartPoint { dayLabel, fullDate, revenue }`, `TopProduct { id, name, unitsSold }`, `PendingOrder { id, customerName, itemsSummary, totalAmount, status, createdAt }`.
  - `components/admin/SalesRangeTabs.tsx`: `<SalesRangeTabs active={range} />`.

- [ ] **Step 1: Удалить мок-функции из `lib/orders.ts`**

Оставить в `lib/orders.ts` только `submitOrder()` и типы `SubmitOrderPayload`/`SubmitOrderResult`, плюс строку ре-экспорта констант (посмотреть текущую — вероятно `export { ORDER_STATUSES, ... } from "@/lib/orderStatus"` или через `export *`). Удалить: `MockOrderInput`, `OrderRecord`, `MOCK_ORDERS_INPUT`, `MOCK_ORDERS`, `getOrders`, `getOrderById`, `getCustomerOrderHistory`, `updateOrderStatus`, все связанные хелперы (`minutesAgo`-расчёт и т.п.).

- [ ] **Step 2: Убрать мёртвые describe-блоки из `lib/orders.test.ts`**

Удалить `describe("getOrders")`, `describe("getOrderById")`, `describe("getCustomerOrderHistory")`, `describe("updateOrderStatus")` и их импорты. Оставить `describe("submitOrder")` и `describe("ORDER_STATUSES")` нетронутыми. Убрать из `import { ... } from "@/lib/orders"` удалённые имена.

- [ ] **Step 3: Run — verify зелёное после удаления**

Run: `npx vitest run lib/orders.test.ts`
Expected: PASS (остались только `submitOrder` + `ORDER_STATUSES`).

Run: `npx tsc --noEmit`
Expected: **ошибки** в `lib/dashboard.ts`, `lib/customers.ts`(нет — уже переписан в Task 2), `app/pekarnya-control/(protected)/page.tsx`, `components/admin/Dashboard.tsx`, `customers/[id]` — там, где импортировался удалённый `@/lib/orders`. Это ожидаемо, чиним в следующих шагах.

- [ ] **Step 4: `lib/dashboardStats.ts` — summary (failing test)**

Создать `lib/dashboardStats.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const orderFindManyMock = vi.hoisted(() => vi.fn());
const orderItemGroupByMock = vi.hoisted(() => vi.fn());
const productFindManyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findMany: orderFindManyMock },
    orderItem: { groupBy: orderItemGroupByMock },
    product: { findMany: productFindManyMock },
  },
}));

beforeEach(() => {
  orderFindManyMock.mockReset();
  orderItemGroupByMock.mockReset();
  productFindManyMock.mockReset();
});

describe("getDashboardSummary", () => {
  it("нули без деления на ноль при пустой БД", async () => {
    orderFindManyMock.mockResolvedValue([]);
    const { getDashboardSummary } = await import("@/lib/dashboardStats");
    const s = await getDashboardSummary();
    expect(s).toMatchObject({ ordersToday: 0, revenueToday: 0, avgCheckToday: 0 });
  });

  it("средний чек = выручка / кол-во", async () => {
    const now = new Date();
    orderFindManyMock.mockResolvedValue([
      { createdAt: now, totalAmount: 300 },
      { createdAt: now, totalAmount: 500 },
    ]);
    const { getDashboardSummary } = await import("@/lib/dashboardStats");
    const s = await getDashboardSummary();
    expect(s.avgCheckToday).toBe(400);
  });
});

describe("getSalesChart", () => {
  it("days → 7 точек", async () => {
    orderFindManyMock.mockResolvedValue([]);
    const { getSalesChart } = await import("@/lib/dashboardStats");
    expect(await getSalesChart("days")).toHaveLength(7);
  });
  it("weeks → 8 точек, months → 6 точек", async () => {
    orderFindManyMock.mockResolvedValue([]);
    const { getSalesChart } = await import("@/lib/dashboardStats");
    expect(await getSalesChart("weeks")).toHaveLength(8);
    expect(await getSalesChart("months")).toHaveLength(6);
  });
  it("суммирует выручку в правильный бакет дня", async () => {
    const today = new Date();
    orderFindManyMock.mockResolvedValue([{ createdAt: today, totalAmount: 1000 }]);
    const { getSalesChart } = await import("@/lib/dashboardStats");
    const points = await getSalesChart("days");
    expect(points[points.length - 1].revenue).toBe(1000);
  });
});

describe("getTopProducts", () => {
  it("склеивает groupBy с именами товаров", async () => {
    orderItemGroupByMock.mockResolvedValue([{ productId: 5, _sum: { quantity: 42 } }]);
    productFindManyMock.mockResolvedValue([{ id: 5, name: "Латте" }]);
    const { getTopProducts } = await import("@/lib/dashboardStats");
    expect(await getTopProducts()).toEqual([{ id: 5, name: "Латте", unitsSold: 42 }]);
  });
});

describe("getPendingOrders", () => {
  it("возвращает до 4 заказов со статусом NEW/IN_PROGRESS", async () => {
    orderFindManyMock.mockResolvedValue([
      { id: 1, customerName: "А", totalAmount: 100, status: "NEW", createdAt: new Date(), items: [{ productNameSnapshot: "Кофе", quantity: 2 }] },
    ]);
    const { getPendingOrders } = await import("@/lib/dashboardStats");
    const [o] = await getPendingOrders();
    expect(o).toMatchObject({ id: 1, itemsSummary: "Кофе × 2", status: "NEW" });
  });
});
```

- [ ] **Step 5: Run — verify fail**

Run: `npx vitest run lib/dashboardStats.test.ts`
Expected: FAIL — модуля нет.

- [ ] **Step 6: Реализовать `lib/dashboardStats.ts`**

Создать файл (удалить старый `lib/dashboard.ts` в конце шага). Реализация:

```ts
import { prisma } from "@/lib/prisma";

// Дашборд (docs/plan.md, пункт 15) — агрегаты по не-отменённым заказам из Prisma.
// Заменяет мок lib/dashboard.ts. Форма возвращаемых типов сохранена, чтобы
// components/admin/Dashboard.tsx правился минимально.
const NOT_CANCELLED = { status: { not: "CANCELLED" as const } };

export interface DashboardSummary {
  ordersToday: number;
  revenueToday: number;
  avgCheckToday: number;
  ordersWeek: number;
  revenueWeek: number;
  avgCheckWeek: number;
}

function startOfToday(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}
function daysAgo(n: number, now = new Date()): Date {
  const d = startOfToday(now);
  d.setDate(d.getDate() - n);
  return d;
}
const avg = (sum: number, count: number) => (count === 0 ? 0 : Math.round(sum / count));

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const weekStart = daysAgo(6);
  const orders = await prisma.order.findMany({
    where: { ...NOT_CANCELLED, createdAt: { gte: weekStart } },
    select: { createdAt: true, totalAmount: true },
  });
  const today = startOfToday();
  const todays = orders.filter((o) => o.createdAt >= today);
  const revenueToday = todays.reduce((s, o) => s + o.totalAmount, 0);
  const revenueWeek = orders.reduce((s, o) => s + o.totalAmount, 0);
  return {
    ordersToday: todays.length,
    revenueToday,
    avgCheckToday: avg(revenueToday, todays.length),
    ordersWeek: orders.length,
    revenueWeek,
    avgCheckWeek: avg(revenueWeek, orders.length),
  };
}

export type SalesRange = "days" | "weeks" | "months";
export const SALES_RANGES: SalesRange[] = ["days", "weeks", "months"];

export interface SalesChartPoint {
  dayLabel: string; // "Пн" | "12–18.08" | "Авг"
  fullDate: string;
  revenue: number;
}

const WEEKDAY = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTH = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

export async function getSalesChart(range: SalesRange): Promise<SalesChartPoint[]> {
  const now = new Date();
  const bucketCount = range === "days" ? 7 : range === "weeks" ? 8 : 6;

  // границы бакетов от старого к новому
  const buckets: { start: Date; end: Date; label: string; fullDate: string }[] = [];
  for (let i = bucketCount - 1; i >= 0; i--) {
    if (range === "days") {
      const start = daysAgo(i, now);
      const end = daysAgo(i - 1, now);
      buckets.push({
        start, end,
        label: WEEKDAY[start.getDay()],
        fullDate: start.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
      });
    } else if (range === "weeks") {
      const end = daysAgo(i * 7 - 7, now);
      const start = daysAgo(i * 7, now);
      const last = new Date(end);
      last.setDate(last.getDate() - 1);
      buckets.push({
        start, end,
        label: `${start.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}`,
        fullDate: `${start.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}–${last.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}`,
      });
    } else {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      buckets.push({
        start, end,
        label: MONTH[start.getMonth()],
        fullDate: `${MONTH[start.getMonth()]} ${start.getFullYear()}`,
      });
    }
  }

  const windowStart = buckets[0].start;
  const orders = await prisma.order.findMany({
    where: { ...NOT_CANCELLED, createdAt: { gte: windowStart } },
    select: { createdAt: true, totalAmount: true },
  });

  return buckets.map((b) => ({
    dayLabel: b.label,
    fullDate: b.fullDate,
    revenue: orders
      .filter((o) => o.createdAt >= b.start && o.createdAt < b.end)
      .reduce((s, o) => s + o.totalAmount, 0),
  }));
}

export interface TopProduct {
  id: number;
  name: string;
  unitsSold: number;
}

export async function getTopProducts(): Promise<TopProduct[]> {
  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: NOT_CANCELLED },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });
  const ids = grouped.map((g) => g.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  return grouped.map((g) => ({
    id: g.productId,
    name: nameById.get(g.productId) ?? `Товар #${g.productId}`,
    unitsSold: g._sum.quantity ?? 0,
  }));
}

export type PendingOrderStatus = "NEW" | "IN_PROGRESS";

export interface PendingOrder {
  id: number;
  customerName: string;
  itemsSummary: string;
  totalAmount: number;
  status: PendingOrderStatus;
  createdAt: Date;
}

export async function getPendingOrders(): Promise<PendingOrder[]> {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["NEW", "IN_PROGRESS"] } },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true, customerName: true, totalAmount: true, status: true, createdAt: true,
      items: { select: { productNameSnapshot: true, quantity: true } },
    },
  });
  return orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    itemsSummary: o.items.map((i) => `${i.productNameSnapshot} × ${i.quantity}`).join(", "),
    totalAmount: o.totalAmount,
    status: o.status as PendingOrderStatus,
    createdAt: o.createdAt,
  }));
}
```

Затем `git rm lib/dashboard.ts` (или Delete-tool). Проверить, что никто больше не импортирует `@/lib/dashboard` (`grep -rn "lib/dashboard\"" app components lib`).

- [ ] **Step 7: Run — verify pass**

Run: `npx vitest run lib/dashboardStats.test.ts`
Expected: PASS.

- [ ] **Step 8: `SalesRangeTabs` компонент**

Создать `components/admin/SalesRangeTabs.tsx` (Server Component — без `"use client"`, просто ссылки):

```tsx
import Link from "next/link";
import type { SalesRange } from "@/lib/dashboardStats";

const TABS: { range: SalesRange; label: string }[] = [
  { range: "days", label: "Дни" },
  { range: "weeks", label: "Недели" },
  { range: "months", label: "Месяцы" },
];

// Переключатель периода графика продаж на дашборде (about-project.md, пункт 1 —
// "по дням/неделям/месяцам"). Обычные ссылки с ?range=, без клиентского JS —
// тот же приём, что табы в /pekarnya-control/pages.
export function SalesRangeTabs({ active }: { active: SalesRange }) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {TABS.map((tab) => (
        <Link
          key={tab.range}
          href={tab.range === "days" ? "/pekarnya-control" : `/pekarnya-control?range=${tab.range}`}
          role="tab"
          aria-selected={active === tab.range}
          className={
            active === tab.range
              ? "rounded-sm border border-forest-ink px-3 py-1.5 font-venuscom text-caption uppercase text-forest-ink"
              : "rounded-sm border border-transparent px-3 py-1.5 font-venuscom text-caption uppercase text-black-olive/60 hover:text-black-olive"
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 9: Обновить `Dashboard.tsx`**

`components/admin/Dashboard.tsx`:
- импорты: убрать `import { ORDER_STATUS_LABELS } from "@/lib/orders"` → `from "@/lib/orderStatus"`; типы — из `@/lib/dashboardStats`; добавить `import { formatTimeAgo } from "@/lib/utils"`; `import { SalesRangeTabs } from "./SalesRangeTabs"`; `import type { SalesRange } from "@/lib/dashboardStats"`
- `DashboardProps` — добавить `range: SalesRange`
- в секции «График продаж» заголовок → рядом отрисовать `<SalesRangeTabs active={range} />`; подпись секции «последние 7 дней» → «продажи»
- все `order.minutesAgo` / `notification.minutesAgo` / `latestOrder.minutesAgo` → `formatTimeAgo(order.createdAt)` (для уведомлений — `formatTimeAgo(latestOrder.createdAt)`; для отзывов-заглушек, где времени нет — оставить как есть либо убрать строку времени у отзывов)
- `pendingOrders` строки: `order.createdAt` вместо `order.minutesAgo`
- классы-ступеньки высоты (`SALES_BAR_HEIGHT_STEPS` и пр.) не трогать

- [ ] **Step 10: Обновить `app/pekarnya-control/(protected)/page.tsx`**

```tsx
import type { Metadata } from "next";
import { Dashboard } from "@/components/admin/Dashboard";
import {
  getDashboardSummary, getPendingOrders, getSalesChart, getTopProducts,
  SALES_RANGES, type SalesRange,
} from "@/lib/dashboardStats";
import { getAdminReviews } from "@/lib/reviewsApi";

export const metadata: Metadata = { title: "Дашборд — Coffee Bakery" };

interface Props { searchParams: Promise<{ range?: string }> }

function parseRange(raw: string | undefined): SalesRange {
  return SALES_RANGES.includes(raw as SalesRange) ? (raw as SalesRange) : "days";
}

export default async function AdminDashboardPage({ searchParams }: Props) {
  const { range: rawRange } = await searchParams;
  const range = parseRange(rawRange);
  const [summary, salesChart, topProducts, pendingOrders, reviewRows] = await Promise.all([
    getDashboardSummary(),
    getSalesChart(range),
    getTopProducts(),
    getPendingOrders(),
    getAdminReviews(),
  ]);
  const reviews = reviewRows.map((row) => ({
    id: row.id, authorName: row.authorName, quoteText: row.quoteText,
    productName: row.productName ?? "", imageUrl: row.imageUrl ?? "",
    isApproved: row.isApproved, shopReply: row.shopReply,
  }));
  return (
    <Dashboard
      summary={summary} salesChart={salesChart} topProducts={topProducts}
      pendingOrders={pendingOrders} reviews={reviews} range={range}
    />
  );
}
```

- [ ] **Step 11: Прогнать проверки**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: зелёное. Если `tsc` ругается на `customers/[id]/page.tsx` — оно уже поправлено в Task 2; если на что-то ещё импортирующее `@/lib/dashboard` или удалённые функции `@/lib/orders` — поправить импорт на `@/lib/dashboardStats` / `@/lib/orderAdmin`.

- [ ] **Step 12: Ручная проверка + commit**

Ручная (Neon, с демо-заказами появятся после Task 7 seed; пока может быть пусто — проверить, что не падает и показывает нули/пустые таблицы): `/pekarnya-control` открывается, переключатель Дни/Недели/Месяцы меняет `?range=` и график.

```bash
git add lib/ components/admin/ app/pekarnya-control/\(protected\)/page.tsx
git rm lib/dashboard.ts
git commit -m "feat(admin): дашборд на реальных агрегатах, убран мок заказов

lib/dashboard.ts → lib/dashboardStats.ts (Prisma-агрегаты по не-отменённым
заказам), переключатель периода дни/недели/месяцы. lib/orders.ts сжат до
submitOrder + ре-экспорт констант; мок MOCK_ORDERS и его тесты удалены.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Блок D — управление страницами пишет в БД

**Files:**
- Rewrite: `lib/pages.ts`
- Create: `lib/pageAdminApi.ts`, `lib/validations/page.ts`, `lib/validations/banner.ts`
- Create: `app/api/pages/[slug]/route.ts`, `app/api/banners/route.ts`
- Modify: `components/admin/PageContentForm.tsx`, `components/admin/BannerManager.tsx`
- Modify: `prisma/seed.ts` (`seedSitePages`, `seedBanners`)
- Test: `lib/pages.test.ts`, `lib/validations/page.test.ts`, `lib/validations/banner.test.ts`, `app/api/pages/[slug]/route.test.ts`, `app/api/banners/route.test.ts`

**Interfaces:**
- Consumes: `prisma`; `requireAdminSession` из `@/lib/auth`.
- Produces:
  - `lib/pages.ts`: `getSitePages()`, `getSitePageBySlug(slug: PageSlug)`, `getBanners()`; типы `PageSlug = "about"|"contacts"|"delivery"`, `SitePage`, `Banner`, `SitePageInput = Omit<SitePage,"slug"|"updatedAt">`, `BannerInput = Omit<Banner,"id"|"createdAt"|"sortOrder"> & { id: number | null }`.
  - `lib/validations/page.ts`: `sitePageInputSchema`, `PAGE_SLUGS: PageSlug[]`.
  - `lib/validations/banner.ts`: `bannerListSchema` (array).
  - `lib/pageAdminApi.ts`: `updateSitePage(slug, input) → Promise<{ok:true}|{ok:false,error}>`, `saveBanners(banners) → Promise<{ok:true}|{ok:false,error}>`.
  - Роуты: `PATCH /api/pages/[slug]`, `PUT /api/banners`.

- [ ] **Step 1: Валидация страниц (failing test → impl → pass)**

`lib/validations/page.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sitePageInputSchema } from "@/lib/validations/page";

describe("sitePageInputSchema", () => {
  it("принимает валидный контент", () => {
    expect(sitePageInputSchema.safeParse({
      title: "О нас", content: "текст", seoTitle: "О нас — Coffee Bakery", seoDescription: "описание",
    }).success).toBe(true);
  });
  it("отклоняет пустой title", () => {
    expect(sitePageInputSchema.safeParse({
      title: "", content: "т", seoTitle: "с", seoDescription: "о",
    }).success).toBe(false);
  });
});
```

`lib/validations/page.ts`:

```ts
import { z } from "zod";

export type PageSlug = "about" | "contacts" | "delivery";
export const PAGE_SLUGS: PageSlug[] = ["about", "contacts", "delivery"];

export const sitePageInputSchema = z.object({
  title: z.string().trim().min(1, "Укажите заголовок").max(200),
  content: z.string().trim().min(1, "Укажите текст страницы").max(5000),
  seoTitle: z.string().trim().min(1, "Укажите SEO title").max(200),
  seoDescription: z.string().trim().min(1, "Укажите SEO description").max(400),
});

export type SitePageInputParsed = z.infer<typeof sitePageInputSchema>;
```

Run: `npx vitest run lib/validations/page.test.ts` — PASS.

- [ ] **Step 2: Валидация баннеров (failing test → impl → pass)**

`lib/validations/banner.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { bannerListSchema } from "@/lib/validations/banner";

describe("bannerListSchema", () => {
  it("принимает пустой imageUrl, требует title/link", () => {
    expect(bannerListSchema.safeParse([
      { imageUrl: "", title: "Акция", link: "#menu", isActive: true },
    ]).success).toBe(true);
  });
  it("отклоняет пустой title", () => {
    expect(bannerListSchema.safeParse([
      { imageUrl: "", title: "", link: "#menu", isActive: true },
    ]).success).toBe(false);
  });
  it("принимает пустой массив (все баннеры удалены)", () => {
    expect(bannerListSchema.safeParse([]).success).toBe(true);
  });
});
```

`lib/validations/banner.ts`:

```ts
import { z } from "zod";

export const bannerInputSchema = z.object({
  imageUrl: z.string().trim().max(500),
  title: z.string().trim().min(1, "Укажите заголовок баннера").max(200),
  link: z.string().trim().min(1, "Укажите ссылку").max(500),
  isActive: z.boolean(),
});

export const bannerListSchema = z.array(bannerInputSchema).max(20);
export type BannerInputParsed = z.infer<typeof bannerInputSchema>;
```

Run: `npx vitest run lib/validations/banner.test.ts` — PASS.

- [ ] **Step 3: `lib/pages.ts` на Prisma (failing test → impl → pass)**

`lib/pages.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const pageFindMany = vi.hoisted(() => vi.fn());
const pageFindUnique = vi.hoisted(() => vi.fn());
const bannerFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sitePage: { findMany: pageFindMany, findUnique: pageFindUnique },
    banner: { findMany: bannerFindMany },
  },
}));

beforeEach(() => {
  pageFindMany.mockReset(); pageFindUnique.mockReset(); bannerFindMany.mockReset();
});

describe("getSitePageBySlug", () => {
  it("возвращает страницу по slug", async () => {
    pageFindUnique.mockResolvedValueOnce({ slug: "about", title: "О нас" });
    const { getSitePageBySlug } = await import("@/lib/pages");
    expect(await getSitePageBySlug("about")).toMatchObject({ slug: "about" });
  });
});

describe("getBanners", () => {
  it("сортирует по sortOrder", async () => {
    bannerFindMany.mockResolvedValueOnce([]);
    const { getBanners } = await import("@/lib/pages");
    await getBanners();
    expect(bannerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { sortOrder: "asc" } })
    );
  });
});
```

`lib/pages.ts` — полностью заменить:

```ts
import { prisma } from "@/lib/prisma";
import type { PageSlug } from "@/lib/validations/page";

export type { PageSlug };

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
```

Run: `npx vitest run lib/pages.test.ts` — PASS.
Затем `npx tsc --noEmit` — ошибки в `PageContentForm.tsx`/`BannerManager.tsx`/`pages/page.tsx` (импортируют удалённые `updateSitePage`/`saveBanners` из `@/lib/pages`). Чиним в шагах 6–7.

- [ ] **Step 4: `PATCH /api/pages/[slug]` (failing test → impl → pass)**

`app/api/pages/[slug]/route.test.ts` — по образцу `app/api/products/route.test.ts` (моки `@/lib/prisma`, `@/lib/auth`). Кейсы: 401 без сессии; 403 не-ADMIN; 400 неизвестный slug; 400 невалидное тело; 200 при успехе (проверить `prisma.sitePage.update` вызван с `where: { slug }`).

`app/api/pages/[slug]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { sitePageInputSchema, PAGE_SLUGS, type PageSlug } from "@/lib/validations/page";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAdminSession(["ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  const { slug } = await params;
  if (!PAGE_SLUGS.includes(slug as PageSlug)) {
    return NextResponse.json({ error: "Неизвестная страница" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = sitePageInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные данные страницы", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.sitePage.update({ where: { slug }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/pages/[slug]:", error);
    return NextResponse.json({ error: "Не удалось сохранить страницу" }, { status: 500 });
  }
}
```

Run: `npx vitest run app/api/pages/[slug]/route.test.ts` — PASS.

- [ ] **Step 5: `PUT /api/banners` (failing test → impl → pass)**

`app/api/banners/route.test.ts` — кейсы: 401/403; 400 невалидный массив; 200 при успехе; проверить, что замена идёт в `$transaction` (`deleteMany` + `createMany` с `sortOrder`).

`app/api/banners/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { bannerListSchema } from "@/lib/validations/banner";

export async function PUT(request: Request) {
  const auth = await requireAdminSession(["ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = bannerListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректный список баннеров", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction([
      prisma.banner.deleteMany({}),
      prisma.banner.createMany({
        data: parsed.data.map((b, index) => ({ ...b, sortOrder: index })),
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/banners:", error);
    return NextResponse.json({ error: "Не удалось сохранить баннеры" }, { status: 500 });
  }
}
```

Run: `npx vitest run app/api/banners/route.test.ts` — PASS.

- [ ] **Step 6: `lib/pageAdminApi.ts` (клиентский helper)**

```ts
import type { SitePageInput, BannerInput } from "@/lib/pages";

// Клиентские мутации раздела «Управление страницами» (docs/plan.md, пункт 20).
// Формы админки — клиентские, поэтому пишут через HTTP-границу /api/* (проверка
// сессии ADMIN и zod — в роут-хендлерах). Тот же приём, что lib/productAdminApi.ts.
export type PageMutationResult = { ok: true } | { ok: false; error: string };

async function errorFrom(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function updateSitePage(
  slug: string, input: SitePageInput
): Promise<PageMutationResult> {
  try {
    const response = await fetch(`/api/pages/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) return { ok: false, error: await errorFrom(response, "Не удалось сохранить страницу.") };
    return { ok: true };
  } catch {
    return { ok: false, error: "Нет связи с сервером. Попробуйте ещё раз." };
  }
}

export async function saveBanners(banners: BannerInput[]): Promise<PageMutationResult> {
  try {
    const response = await fetch("/api/banners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        banners.map((b) => ({ imageUrl: b.imageUrl, title: b.title, link: b.link, isActive: b.isActive }))
      ),
    });
    if (!response.ok) return { ok: false, error: await errorFrom(response, "Не удалось сохранить баннеры.") };
    return { ok: true };
  } catch {
    return { ok: false, error: "Нет связи с сервером. Попробуйте ещё раз." };
  }
}
```

- [ ] **Step 7: Обновить `PageContentForm.tsx` и `BannerManager.tsx`**

`PageContentForm.tsx`:
- импорт `updateSitePage` из `@/lib/pageAdminApi` (не `@/lib/pages`); `PageSlug` из `@/lib/pages` остаётся
- `useRouter` из `next/navigation`; состояние `error: string | null`
- `submit()`: `const result = await updateSitePage(slug, { title, content, seoTitle, seoDescription });` → при `!result.ok` показать `result.error`, при `ok` — `router.refresh()` + `setSavedAt(Date.now())`
- текст «Сохранено (заглушка)» → «Сохранено»
- добавить вывод `{error && <p className="font-venuscom text-caption font-semibold text-red-600">{error}</p>}`

`BannerManager.tsx`:
- импорт `saveBanners` из `@/lib/pageAdminApi`; типы `Banner`/`BannerInput` из `@/lib/pages`
- аналогично: ошибка сервера, `router.refresh()`, текст «Сохранено»

- [ ] **Step 8: `seedSitePages` + `seedBanners`**

В `prisma/seed.ts` добавить (тексты взять из старого мока `lib/pages.ts` до его перезаписи — сохранить их в этот шаг):

```ts
async function seedSitePages() {
  const pages = [
    { slug: "about", title: "О нас", content: "Мы — небольшая кофейня-пекарня…",
      seoTitle: "О нас — Coffee Bakery", seoDescription: "История кофейни-пекарни, адрес и часы работы." },
    { slug: "contacts", title: "Контакты", content: "Телефон: +7 (900) 000-00-00…",
      seoTitle: "Контакты — Coffee Bakery", seoDescription: "Телефон, email и адрес кофейни-пекарни." },
    { slug: "delivery", title: "Доставка и оплата", content: "Самовывоз бесплатно…",
      seoTitle: "Доставка и оплата — Coffee Bakery", seoDescription: "Условия доставки и способы оплаты заказов." },
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
```

`seedSitePages` — `update: {}` (не перетирать при повторном сиде; только создать отсутствующие).

- [ ] **Step 9: Прогнать всё + ручная проверка**

Run: `npx tsc --noEmit && npm run lint && npx vitest run` — зелёное.

Ручная (Neon): `npx prisma db seed` → в админке под ADMIN: `/pekarnya-control/pages` — правка текста «О нас» → «Сохранено» → перезагрузка страницы сохраняет изменение; вкладка «Баннеры» — добавить/удалить/переключить активность → «Сохранить баннеры» → перезагрузка сохраняет.

- [ ] **Step 10: Commit**

```bash
git add lib/ app/api/pages app/api/banners components/admin/PageContentForm.tsx components/admin/BannerManager.tsx prisma/seed.ts
git commit -m "feat(admin): управление страницами пишет в БД

Модели SitePage/Banner на Prisma, PATCH /api/pages/[slug] и PUT /api/banners
за requireAdminSession(ADMIN). Формы показывают ошибки сервера и router.refresh().
Сид создаёт 3 фиксированные страницы и демо-баннеры.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Блок E — настройки и пользователи админки в БД, ADMIN-only разделы

**Files:**
- Rewrite: `lib/settings.ts`
- Modify: `lib/auth.ts` (`requireAdminSession` возвращает `email`)
- Create: `lib/settingsAdminApi.ts`, `lib/validations/adminUser.ts`, `lib/validations/notificationSettings.ts`
- Create: `app/api/admin-users/route.ts`, `app/api/admin-users/[id]/route.ts`, `app/api/settings/notifications/route.ts`
- Create: `app/pekarnya-control/(protected)/(admin-only)/layout.tsx`
- Move: `app/pekarnya-control/(protected)/pages/` → `.../(admin-only)/pages/`; `.../settings/` → `.../(admin-only)/settings/`
- Modify: `components/admin/AdminUsersManager.tsx`, `components/admin/NotificationSettingsForm.tsx`, `components/admin/Sidebar.tsx`
- Modify: `prisma/seed.ts` (опциональный второй админ)
- Test: `lib/settings.test.ts`, `lib/validations/adminUser.test.ts`, `lib/validations/notificationSettings.test.ts`, `app/api/admin-users/route.test.ts`, `app/api/admin-users/[id]/route.test.ts`, `app/api/settings/notifications/route.test.ts`, `lib/auth.test.ts` (дополнить)

**Interfaces:**
- Consumes: `prisma`; `bcryptjs`; `requireAdminSession` из `@/lib/auth`; `AdminRole` из `@/types/next-auth`.
- Produces:
  - `requireAdminSession(roles?)` → `{ ok: true; role: AdminRole; email: string } | { ok: false; status: 401|403 }`.
  - `lib/settings.ts`: `getAdminUsers()`, `createAdminUser(input)`, `updateAdminUserRole(id, role)`, `deleteAdminUser(id)`, `getNotificationSettings()`, `updateNotificationSettings(input)`. `LastAdminError` (класс/тег) при попытке снять последнего ADMIN. Типы `AdminUserRecord { id, email, role }`, `NotificationSettings`, `ADMIN_ROLES`, `ADMIN_ROLE_LABELS`.
  - `lib/settingsAdminApi.ts`: `createAdminUser`, `updateAdminUserRole`, `deleteAdminUser`, `updateNotificationSettings` → `Promise<{ok:true}|{ok:false,error}>`.
  - Роуты: `GET/POST /api/admin-users`, `PATCH/DELETE /api/admin-users/[id]`, `PUT /api/settings/notifications`.

- [ ] **Step 1: `requireAdminSession` возвращает email (failing test → impl → pass)**

`lib/auth.test.ts` — существующие кейсы не трогать; добавить `describe("requireAdminSession — email")` (мок `getServerSession` уже используется в файле — свериться): при валидной сессии результат содержит `email`.

В `lib/auth.ts`:

```ts
export type RequireAdminResult =
  | { ok: true; role: AdminRole; email: string }
  | { ok: false; status: 401 | 403 };

export async function requireAdminSession(
  allowedRoles: AdminRole[] = ["ADMIN"]
): Promise<RequireAdminResult> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const email = session?.user?.email;
  if (!role || !email) return { ok: false, status: 401 };
  if (!allowedRoles.includes(role)) return { ok: false, status: 403 };
  return { ok: true, role, email };
}
```

Run: `npx vitest run lib/auth.test.ts` — PASS (существующие + новый). Существующие route-тесты мокают `requireAdminSession` целиком — на них не влияет.

- [ ] **Step 2: Валидации (failing test → impl → pass)**

`lib/validations/adminUser.ts`:

```ts
import { z } from "zod";

export const ADMIN_ROLE_VALUES = ["ADMIN", "ORDER_MANAGER"] as const;

export const createAdminUserSchema = z.object({
  email: z.string().trim().min(1, "Укажите email").email("Некорректный email"),
  password: z.string().min(8, "Пароль минимум 8 символов").max(200),
  role: z.enum(ADMIN_ROLE_VALUES),
});

export const updateAdminUserRoleSchema = z.object({
  role: z.enum(ADMIN_ROLE_VALUES),
});
```

`lib/validations/notificationSettings.ts`:

```ts
import { z } from "zod";

export const notificationSettingsSchema = z.object({
  notifyEmail: z.boolean(),
  notifyEmailAddress: z.string().trim().max(200),
  notifySms: z.boolean(),
  notifySmsPhone: z.string().trim().max(50),
});
```

Тесты `lib/validations/adminUser.test.ts` (пароль < 8 → fail; неизвестная роль → fail; валидный → pass) и `lib/validations/notificationSettings.test.ts` (не-boolean флаг → fail).

Run: `npx vitest run lib/validations/adminUser.test.ts lib/validations/notificationSettings.test.ts` — PASS.

- [ ] **Step 3: `lib/settings.ts` на Prisma (failing test → impl → pass)**

`lib/settings.test.ts` — моки `@/lib/prisma` (`adminUser`, `notificationSettings`) и `bcryptjs`. Кейсы:
- `getAdminUsers` — `select` без `passwordHash`
- `createAdminUser` — хэширует пароль, `adminUser.create` с `passwordHash`
- `deleteAdminUser` — если удаляемый единственный ADMIN → бросает/возвращает `LastAdminError`
- `updateAdminUserRole` — смена ADMIN→ORDER_MANAGER у единственного ADMIN → `LastAdminError`
- `getNotificationSettings` — `upsert where id:1`

`lib/settings.ts` — полностью заменить:

```ts
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { AdminRole } from "@/types/next-auth";

export type { AdminRole };
export const ADMIN_ROLES: AdminRole[] = ["ADMIN", "ORDER_MANAGER"];
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  ADMIN: "Администратор",
  ORDER_MANAGER: "Менеджер заказов",
};

export interface AdminUserRecord {
  id: number;
  email: string;
  role: AdminRole;
}
export interface NotificationSettings {
  notifyEmail: boolean;
  notifyEmailAddress: string;
  notifySms: boolean;
  notifySmsPhone: string;
}
export interface AdminUserInput {
  email: string;
  password: string;
  role: AdminRole;
}

// Ошибка «нельзя снять последнего ADMIN» — роут ловит её и отдаёт 409.
export class LastAdminError extends Error {
  constructor() {
    super("Нельзя удалить или разжаловать последнего администратора");
    this.name = "LastAdminError";
  }
}

export async function getAdminUsers(): Promise<AdminUserRecord[]> {
  return prisma.adminUser.findMany({
    orderBy: { id: "asc" },
    select: { id: true, email: true, role: true },
  }) as Promise<AdminUserRecord[]>;
}

export async function createAdminUser(input: AdminUserInput): Promise<AdminUserRecord> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, 10);
  const created = await prisma.adminUser.create({
    data: { email, passwordHash, role: input.role },
    select: { id: true, email: true, role: true },
  });
  return created as AdminUserRecord;
}

async function assertNotLastAdmin(targetId: number): Promise<void> {
  const target = await prisma.adminUser.findUnique({ where: { id: targetId } });
  if (!target || target.role !== "ADMIN") return;
  const adminCount = await prisma.adminUser.count({ where: { role: "ADMIN" } });
  if (adminCount <= 1) throw new LastAdminError();
}

export async function updateAdminUserRole(id: number, role: AdminRole): Promise<AdminUserRecord> {
  if (role !== "ADMIN") await assertNotLastAdmin(id);
  const updated = await prisma.adminUser.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, role: true },
  });
  return updated as AdminUserRecord;
}

export async function deleteAdminUser(id: number): Promise<void> {
  await assertNotLastAdmin(id);
  await prisma.adminUser.delete({ where: { id } });
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  notifyEmail: false,
  notifyEmailAddress: "",
  notifySms: false,
  notifySmsPhone: "",
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const row = await prisma.notificationSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...DEFAULT_NOTIFICATIONS },
  });
  return {
    notifyEmail: row.notifyEmail,
    notifyEmailAddress: row.notifyEmailAddress,
    notifySms: row.notifySms,
    notifySmsPhone: row.notifySmsPhone,
  };
}

export async function updateNotificationSettings(
  input: NotificationSettings
): Promise<NotificationSettings> {
  const row = await prisma.notificationSettings.upsert({
    where: { id: 1 },
    update: input,
    create: { id: 1, ...input },
  });
  return {
    notifyEmail: row.notifyEmail,
    notifyEmailAddress: row.notifyEmailAddress,
    notifySms: row.notifySms,
    notifySmsPhone: row.notifySmsPhone,
  };
}
```

Run: `npx vitest run lib/settings.test.ts` — PASS. Затем `npx tsc --noEmit` — ошибки в `AdminUsersManager.tsx`/`NotificationSettingsForm.tsx` (импортируют удалённые заглушки) — чиним в шагах 7–8.

- [ ] **Step 4: `GET/POST /api/admin-users` (failing test → impl → pass)**

`app/api/admin-users/route.test.ts` — моки `@/lib/settings`, `@/lib/auth`. Кейсы: GET 401/403/200; POST 401/403, 400 (пароль < 8), 409 (email занят → `createAdminUser` бросает `Prisma P2002` — мок реджектит с `{ code: "P2002" }`), 201 при успехе.

`app/api/admin-users/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAdminUsers, createAdminUser } from "@/lib/settings";
import { createAdminUserSchema } from "@/lib/validations/adminUser";
import { requireAdminSession } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdminSession(["ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }
  try {
    return NextResponse.json(await getAdminUsers());
  } catch (error) {
    console.error("GET /api/admin-users:", error);
    return NextResponse.json({ error: "Не удалось загрузить пользователей" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession(["ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = createAdminUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные данные пользователя", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const user = await createAdminUser(parsed.data);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Пользователь с таким email уже есть" }, { status: 409 });
    }
    console.error("POST /api/admin-users:", error);
    return NextResponse.json({ error: "Не удалось создать пользователя" }, { status: 500 });
  }
}
```

Run: `npx vitest run app/api/admin-users/route.test.ts` — PASS.

- [ ] **Step 5: `PATCH/DELETE /api/admin-users/[id]` (failing test → impl → pass)**

`app/api/admin-users/[id]/route.test.ts` — кейсы:
- 401/403
- PATCH 400 невалидная роль; 200 при успехе; **409 если `updateAdminUserRole` бросает `LastAdminError`**
- DELETE 204 при успехе; **409 `LastAdminError`**; **403 если удаляешь сам себя** (мок `requireAdminSession` возвращает `email`, а `getAdminUserById`/`getAdminUsers` содержит запись с этим email и запрошенным id)
- 404 если пользователя нет (`Prisma P2025`)

`app/api/admin-users/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateAdminUserRole, deleteAdminUser, LastAdminError } from "@/lib/settings";
import { updateAdminUserRoleSchema } from "@/lib/validations/adminUser";
import { requireAdminSession } from "@/lib/auth";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function guardSelf(id: number, email: string): Promise<boolean> {
  const target = await prisma.adminUser.findUnique({ where: { id }, select: { email: true } });
  return target?.email === email;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession(["ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) return NextResponse.json({ error: "Некорректный id" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }
  const parsed = updateAdminUserRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректная роль" }, { status: 400 });
  }

  if (parsed.data.role !== "ADMIN" && (await guardSelf(id, auth.email))) {
    return NextResponse.json({ error: "Нельзя снять роль администратора с самого себя" }, { status: 409 });
  }

  try {
    const updated = await updateAdminUserRole(id, parsed.data.role);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof LastAdminError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }
    console.error("PATCH /api/admin-users/[id]:", error);
    return NextResponse.json({ error: "Не удалось изменить роль" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession(["ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) return NextResponse.json({ error: "Некорректный id" }, { status: 400 });

  if (await guardSelf(id, auth.email)) {
    return NextResponse.json({ error: "Нельзя удалить самого себя" }, { status: 409 });
  }

  try {
    await deleteAdminUser(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof LastAdminError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }
    console.error("DELETE /api/admin-users/[id]:", error);
    return NextResponse.json({ error: "Не удалось удалить пользователя" }, { status: 500 });
  }
}
```

Run: `npx vitest run app/api/admin-users/[id]/route.test.ts` — PASS.

- [ ] **Step 6: `PUT /api/settings/notifications` (failing test → impl → pass)**

`app/api/settings/notifications/route.test.ts` — 401/403; 400 невалидное тело; 200 при успехе.

`app/api/settings/notifications/route.ts`:

```ts
import { NextResponse } from "next/server";
import { updateNotificationSettings } from "@/lib/settings";
import { notificationSettingsSchema } from "@/lib/validations/notificationSettings";
import { requireAdminSession } from "@/lib/auth";

export async function PUT(request: Request) {
  const auth = await requireAdminSession(["ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Требуется вход" : "Недостаточно прав" },
      { status: auth.status }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = notificationSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные настройки", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(await updateNotificationSettings(parsed.data));
  } catch (error) {
    console.error("PUT /api/settings/notifications:", error);
    return NextResponse.json({ error: "Не удалось сохранить настройки" }, { status: 500 });
  }
}
```

Run: `npx vitest run app/api/settings/notifications/route.test.ts` — PASS.

- [ ] **Step 7: `lib/settingsAdminApi.ts`**

```ts
import type { AdminRole, AdminUserInput, NotificationSettings } from "@/lib/settings";

export type SettingsMutationResult = { ok: true } | { ok: false; error: string };

async function errorFrom(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function createAdminUser(input: AdminUserInput): Promise<SettingsMutationResult> {
  return call("/api/admin-users", "POST", input, "Не удалось создать пользователя.");
}
export async function updateAdminUserRole(id: number, role: AdminRole): Promise<SettingsMutationResult> {
  return call(`/api/admin-users/${id}`, "PATCH", { role }, "Не удалось изменить роль.");
}
export async function deleteAdminUser(id: number): Promise<SettingsMutationResult> {
  return call(`/api/admin-users/${id}`, "DELETE", undefined, "Не удалось удалить пользователя.");
}
export async function updateNotificationSettings(
  input: NotificationSettings
): Promise<SettingsMutationResult> {
  return call("/api/settings/notifications", "PUT", input, "Не удалось сохранить настройки.");
}

async function call(
  url: string, method: string, body: unknown, fallback: string
): Promise<SettingsMutationResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) return { ok: false, error: await errorFrom(response, fallback) };
    return { ok: true };
  } catch {
    return { ok: false, error: "Нет связи с сервером. Попробуйте ещё раз." };
  }
}
```

- [ ] **Step 8: Обновить `AdminUsersManager.tsx` и `NotificationSettingsForm.tsx`**

`AdminUsersManager.tsx`:
- импорт мутаций из `@/lib/settingsAdminApi`; `ADMIN_ROLES`/`ADMIN_ROLE_LABELS`/типы из `@/lib/settings`
- `useRouter`; каждый обработчик (`handleRoleChange`/`handleDelete`/`submitCreate`) проверяет `result.ok`; при `!ok` — показать `result.error` (для строки — рядом с ней или общий баннер сверху), **не** менять локальный список; при `ok` — `router.refresh()`
- убрать оптимистичное локальное обновление `setUsers(...)` до ответа сервера — теперь источник правды сервер + `router.refresh()`

`NotificationSettingsForm.tsx`:
- импорт `updateNotificationSettings` из `@/lib/settingsAdminApi`; тип из `@/lib/settings`
- ошибка сервера, `router.refresh()`, текст «Сохранено (заглушка)» → «Сохранено»

- [ ] **Step 9: ADMIN-only route group**

Создать `app/pekarnya-control/(protected)/(admin-only)/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// Разделы «Управление страницами» и «Настройки» — только ADMIN (docs/plan.md,
// пункты 20–21; управление админ-юзерами чувствительно). ORDER_MANAGER
// перенаправляется на дашборд. Дублирует проверку роли в API-роутах (defense-in-depth).
export default async function AdminOnlyLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/pekarnya-control");
  }
  return <>{children}</>;
}
```

Переместить папки (URL не меняются — `(admin-only)` это group):
```bash
git mv "app/pekarnya-control/(protected)/pages" "app/pekarnya-control/(protected)/(admin-only)/pages"
git mv "app/pekarnya-control/(protected)/settings" "app/pekarnya-control/(protected)/(admin-only)/settings"
```

- [ ] **Step 10: Sidebar — скрыть ADMIN-only пункты для ORDER_MANAGER**

`components/admin/Sidebar.tsx` (уже `"use client"`):
- `import { useSession } from "next-auth/react"`
- `const { data: session } = useSession(); const isAdmin = session?.user?.role === "ADMIN";`
- пометить два пункта `navItems` флагом `adminOnly: true` («Управление страницами», «Настройки»)
- в `NavList` фильтровать: `navItems.filter((i) => !i.adminOnly || isAdmin)` — прокинуть `isAdmin` пропом в `NavList` (сейчас принимает `pathname`/`onNavigate`)

- [ ] **Step 11: Опциональный второй админ в seed**

В `prisma/seed.ts`, функция `seedAdminUser()` — после создания основного ADMIN добавить:

```ts
  const managerEmail = process.env.SEED_MANAGER_EMAIL;
  const managerPassword = process.env.SEED_MANAGER_PASSWORD;
  if (managerEmail && managerPassword) {
    await prisma.adminUser.upsert({
      where: { email: managerEmail.trim().toLowerCase() },
      update: { passwordHash: await bcrypt.hash(managerPassword, 10), role: "ORDER_MANAGER" },
      create: {
        email: managerEmail.trim().toLowerCase(),
        passwordHash: await bcrypt.hash(managerPassword, 10),
        role: "ORDER_MANAGER",
      },
    });
  }
```

- [ ] **Step 12: Прогнать всё + ручная проверка**

Run: `npx tsc --noEmit && npm run lint && npx vitest run` — зелёное.

Ручная (Neno): под ADMIN — `/pekarnya-control/settings` открывается, добавление пользователя работает, смена роли работает, удаление последнего ADMIN → ошибка «Нельзя удалить…»; вкладка «Уведомления» — сохранение персистится. Создать `ORDER_MANAGER` (через seed env или через UI), залогиниться им → `/pekarnya-control/settings` и `/pekarnya-control/pages` редиректят на дашборд, пунктов нет в сайдбаре.

- [ ] **Step 13: Commit**

```bash
git add lib/ app/api/admin-users app/api/settings "app/pekarnya-control/(protected)/(admin-only)" components/admin/ prisma/seed.ts
git commit -m "feat(admin): настройки и пользователи админки в БД, ADMIN-only разделы

lib/settings.ts на Prisma (bcrypt для создания, guard последнего ADMIN).
Роуты /api/admin-users[/id] и /api/settings/notifications за requireAdminSession(ADMIN).
Разделы «Настройки» и «Управление страницами» — route group (admin-only) с редиректом
для ORDER_MANAGER, пункты скрыты в сайдбаре.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Блок F — e2e «заявка видна в админке»

**Files:**
- Create: `e2e/admin-order.spec.ts`
- Modify: `e2e/checkout-flow.spec.ts` (только комментарий)
- Modify: `.github/workflows/ci.yml` (env для e2e job)
- Modify: `.env.example`

**Interfaces:**
- Consumes: работающий `POST /api/orders` (создаёт заказ + Customer), `GET /api/orders` + страница `/pekarnya-control/orders`, `proxy.ts`, `signIn` через форму логина.

- [ ] **Step 1: Написать `e2e/admin-order.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

// Сквозной сценарий, шаг 5 (docs/plan.md, пункт 36): гость оформляет заявку →
// админ входит в панель → видит эту заявку в списке заказов.
// Дополняет e2e/checkout-flow.spec.ts (шаги 1–4).

const CATEGORY_NAME = "Выпечка";
const PRODUCT_NAME = "Грилата с брынзой и зеленью";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@test.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "test-admin-password";

test("гость оформляет заявку → админ видит её в списке заказов", async ({ page }) => {
  const customerName = `E2E Клиент ${Date.now()}`;

  // 1–4. Оформление заявки (как в checkout-flow.spec.ts, кратко)
  await page.goto("/");
  await page.getByRole("tab", { name: CATEGORY_NAME }).click();
  const card = page.locator("article", { hasText: PRODUCT_NAME });
  await card.getByRole("button", { name: "Добавить в корзину" }).click();
  await page.getByRole("button", { name: "Открыть корзину" }).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: "Оформить заказ" }).click();
  await modal.getByLabel("Имя").fill(customerName);
  await modal.getByLabel("Телефон").fill("9008887766");
  await modal.getByLabel("Email (пришлем чек об оплате)").fill("e2e@example.com");
  await modal.getByRole("button", { name: "Отправить заявку" }).click();
  await expect(modal).toHaveAttribute("aria-label", "Заявка принята");

  // 5. Вход в админку
  await page.goto("/pekarnya-control/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Пароль").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /войти/i }).click();

  // 6. Заявка видна в списке заказов
  await page.waitForURL(/\/pekarnya-control(\/orders)?/);
  await page.goto("/pekarnya-control/orders");
  const row = page.locator("tr", { hasText: customerName });
  await expect(row).toBeVisible();
});
```

Свериться с реальными `getLabel`/`getByRole` именами в `LoginForm.tsx` и странице заказов (`app/pekarnya-control/(protected)/orders/page.tsx`) — подставить точные.

- [ ] **Step 2: Run локально**

Предусловие: локальный `.env` содержит `ADMIN_EMAIL`/`ADMIN_PASSWORD`, БД засижена (`npx prisma db seed` создаёт этого админа).

Run: `npm run test:e2e`
Expected: оба спека (`checkout-flow`, `admin-order`) — PASS. Если `admin-order` не находит строку — проверить, что демо-заказы не мешают (имя с `Date.now()` уникально) и что `getByLabel("Пароль")` совпадает с формой.

- [ ] **Step 3: Поправить устаревший комментарий в `checkout-flow.spec.ts`**

Строки 3–7 (шапка) — переписать: `submitOrder()` теперь реальный `fetch("/api/orders")` (задача 66), `/pekarnya-control/*` под `proxy.ts` (задача 61); шаг 5 покрыт отдельным `e2e/admin-order.spec.ts`. Логику теста не трогать.

- [ ] **Step 4: CI env**

`.github/workflows/ci.yml`, job `e2e`, блок `env:` — добавить:

```yaml
      ADMIN_EMAIL: admin@ci.local
      ADMIN_PASSWORD: ci-admin-password-123
      NEXTAUTH_SECRET: ci-only-not-a-real-secret
      NEXTAUTH_URL: http://localhost:3000
```

(`prisma db seed` в job уже вызывается — создаст этого админа + демо-данные.)

- [ ] **Step 5: `.env.example`**

Рядом с `ADMIN_EMAIL`/`ADMIN_PASSWORD` — комментарий, что они нужны и для e2e (создание админа, под которым логинится `admin-order.spec.ts`). Добавить `SEED_MANAGER_EMAIL`/`SEED_MANAGER_PASSWORD` (опционально, второй пользователь-ORDER_MANAGER).

- [ ] **Step 6: Прогнать всё + commit**

Run: `npx tsc --noEmit && npm run lint && npx vitest run && npm run test:e2e`
Expected: зелёное.

```bash
git add e2e/ .github/workflows/ci.yml .env.example
git commit -m "test(e2e): заявка видна в списке заказов админки после входа

Новый e2e/admin-order.spec.ts (шаг 5 пункта 36): гость оформляет заявку →
админ логинится → видит заказ в /pekarnya-control/orders. CI e2e job получает
ADMIN_EMAIL/ADMIN_PASSWORD/NEXTAUTH_SECRET.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Демо-заказы в сиде + документация

**Files:**
- Modify: `prisma/seed.ts` (`seedOrders`, финальный порядок вызовов)
- Modify: `docs/plan.md` (пункты 15/18/20/21)
- Modify: `docs/progress.md` (записи по блокам)
- Verify: `docs/architecture.md` (раздел 7 — ADMIN-only, дерево файлов)

**Interfaces:**
- Consumes: модели `Order`/`OrderItem`/`Customer`, `normalizePhone`.

- [ ] **Step 1: `seedOrders()` — фикстура демо-заказов**

В `prisma/seed.ts` добавить (по образцу удалённого `MOCK_ORDERS_INPUT` — взять из git-истории `lib/orders.ts` до Task 3, ~10–12 заказов, разные клиенты/статусы, `createdAt` разбросан по последним ~35 дням для графика недель/месяцев):

```ts
// Демо-заказы для дашборда и раздела «Клиенты» (иначе на свежей БД они пустые).
// Идемпотентно: upsert по фиксированным id. Товары — реальные id из menu.json.
const ORDER_FIXTURES: Array<{
  id: number; customerName: string; phone: string; email: string;
  status: "NEW" | "IN_PROGRESS" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
  daysAgo: number; items: { productId: number; quantity: number }[];
}> = [
  // ~10–12 записей — заполнить конкретными значениями
];

async function seedOrders() {
  for (const f of ORDER_FIXTURES) {
    const products = await prisma.product.findMany({
      where: { id: { in: f.items.map((i) => i.productId) } },
      select: { id: true, name: true, price: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const orderItems = f.items.flatMap((i) => {
      const p = byId.get(i.productId);
      if (!p) return [];
      return [{ productId: p.id, productNameSnapshot: p.name, priceSnapshot: p.price, quantity: i.quantity }];
    });
    if (orderItems.length === 0) continue;
    const totalAmount = orderItems.reduce((s, it) => s + it.priceSnapshot * it.quantity, 0);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - f.daysAgo);

    await prisma.order.upsert({
      where: { id: f.id },
      update: { status: f.status, totalAmount, createdAt },
      create: {
        id: f.id, status: f.status,
        customerName: f.customerName, customerContact: f.phone, customerEmail: f.email,
        totalAmount, createdAt,
        items: { create: orderItems },
      },
    });
  }
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Order"', 'id'), COALESCE((SELECT MAX(id) FROM "Order"), 1))`;
  // OrderItem.id тоже вручную не ставим, но create вложенный — sequence сдвигается сам.
}
```

**Важно:** при повторном сиде вложенный `items: { create }` в `update`-ветке не указываем (иначе дубли позиций) — в `update` только скалярные поля. Позиции создаются один раз в `create`-ветке.

- [ ] **Step 2: Финальный порядок вызовов в `main()`**

```ts
async function main() {
  await seedCatalog();        // (существующий код по категориям/товарам)
  await seedReviews();
  await seedAdminUser();       // + опциональный ORDER_MANAGER
  await seedSitePages();
  await seedBanners();
  await seedOrders();
  await backfillCustomers();   // привяжет и демо-заказы, и исторические
}
```

(Если `seedCatalog` сейчас инлайн в `main` — обернуть в функцию или оставить как есть, вызвав остальное после.)

- [ ] **Step 3: Прогнать сид на чистой локальной БД**

Run (осторожно, только на dev-БД): пересоздать локальную БД или `npx prisma migrate reset --force` → `npx prisma db seed`
Expected: без ошибок; повторный `npx prisma db seed` — тоже без ошибок и без дублей (проверить `SELECT count(*) FROM "OrderItem"` до/после второго прогона — не меняется).

- [ ] **Step 4: Ручная проверка дашборда с данными**

`/pekarnya-control` — сводка/график/топ товаров/новые заказы заполнены; переключатель Дни/Недели/Месяцы показывает разные разбивки; `/pekarnya-control/customers` — список клиентов из демо-заказов с корректными суммами.

- [ ] **Step 5: `docs/plan.md`**

Пункты 15, 18, 20, 21 — добавить пометку в конце строки: `(доведён до Prisma в хвосте пункта 35)`. Пункт 35 — уточнить, что теперь покрыт полностью (витрина + Товары + Заказы + Dashboard + Клиенты).

- [ ] **Step 6: `docs/architecture.md` раздел 7 + дерево файлов**

- Раздел 7: абзац про то, что `/pekarnya-control/settings` и `/pekarnya-control/pages` доступны только роли `ADMIN` (route group `(admin-only)` + проверка в API-роутах).
- Дерево файлов: добавить `(admin-only)/` group, новые роуты `api/pages`, `api/banners`, `api/admin-users`, `api/settings`, новые `lib/*`.

- [ ] **Step 7: `docs/progress.md` — записи по блокам**

Добавить записи (правило: 2–3 строки, только файлы + суть + новые env). Отдельная запись на каждый коммит Task 1–7, либо одна сводная «Задача N: хвост пункта 35» со списком. Новые env: `SEED_MANAGER_EMAIL`, `SEED_MANAGER_PASSWORD` (опционально); в CI — `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.

Указать: изменения схемы БД — **да** (`docs/architecture.md` раздел 3 актуализирован).

- [ ] **Step 8: Security review**

Прогнать чек-лист `.claude/skills/security-review/SKILL.md` по всем новым/изменённым файлам. Особое внимание:
- все мутирующие роуты (`/api/pages`, `/api/banners`, `/api/admin-users`, `/api/settings/notifications`) — `requireAdminSession(["ADMIN"])` **до** любого обращения к Prisma
- `passwordHash` не попадает в ответы `/api/admin-users` (в `select` только `id`/`email`/`role`)
- пароль нового админа — только bcrypt-хэш, не логируется, не в URL
- guard последнего ADMIN и запрет удаления себя работают
- guard: тело запросов валидируется zod на границе; id из URL — `Number.isInteger`
- ошибки Prisma не пробрасываются клиенту (общий текст + `console.error`)
- `$transaction` в `createOrder` не оставляет полу-created заказ при сбое
Записать результат в `docs/progress.md` (раздел «Security review»).

- [ ] **Step 9: Финальный прогон + commit**

Run: `npx tsc --noEmit && npm run lint && npx vitest run && npm run test:e2e`
Expected: всё зелёное.

```bash
git add prisma/seed.ts docs/
git commit -m "feat(db): демо-заказы в сиде + docs: закрыть хвост пункта 35

seedOrders() — фикстура ~12 заказов для дашборда/клиентов. docs/plan.md,
architecture.md (раздел 7), progress.md актуализированы. Security review пройден.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 10: Push + PR**

```bash
git push -u origin feature/admin-prisma-tail
```

Создать PR в `main` (если классификатор заблокирует `gh pr create` — сообщить пользователю, он создаёт сам). Дождаться зелёного CI. **Merge — только по явному разрешению пользователя** («мерджить?» отдельным вопросом).

---

## Self-Review (проведено при написании плана)

**1. Покрытие спеки:**
- Схема (3 модели + relation) → Task 1 ✅
- Блок A (убрать мок заказов) → Task 3 ✅
- Блок B (дашборд агрегаты + переключатель) → Task 3 ✅
- Блок C (Customer upsert + раздел «Клиенты») → Task 2 ✅
- Блок D (страницы/баннеры → Prisma + API + компоненты + сид) → Task 4 ✅
- Блок E (настройки/admin-users → Prisma + API + ADMIN-only + сид) → Task 5 ✅
- Блок F (e2e шаг 5 + CI env + комментарий) → Task 6 ✅
- Демо-заказы в сиде → Task 7 ✅
- Доки (architecture §3/§7, plan, progress, .env.example) → Task 1 (§3), Task 6 (.env), Task 7 (остальное) ✅
- Security review → Task 7 Step 8 ✅

**2. Плейсхолдеры:** `ORDER_FIXTURES` в Task 7 Step 1 помечен «заполнить конкретными значениями» — это данные-фикстура, конкретные id берутся из актуального `menu.json` на момент исполнения (не хардкодятся в плане, т.к. menu.json менялся). Приемлемо: структура и код полные, наполнение — механическое.

**3. Консистентность типов:**
- `requireAdminSession` result: `{ ok: true; role; email }` — определён в Task 5 Step 1, используется в Task 5 роутах. Task 4 роуты (`/api/pages`, `/api/banners`) написаны до Task 5 и используют только `auth.ok`/`auth.status` — совместимо (лишнее поле `email` не мешает). ⚠️ Порядок: Task 4 не зависит от изменения `requireAdminSession`, но если Task 5 выполняется после Task 4 — ок; если параллельно — Task 4 роуты не сломаются.
- `SalesChartPoint { dayLabel, fullDate, revenue }` — имена сохранены из старого `lib/dashboard.ts`, `Dashboard.tsx` их уже использует ✅
- `PendingOrder`: `minutesAgo` → `createdAt: Date` — Task 3 Step 9 правит `Dashboard.tsx` под это ✅
- `getCustomerById` → `null` (было `undefined`) — Task 2 Step 14 проверяет, что `if (!customer)` корректно ловит оба ✅
- `lib/pages.ts` `PageSlug` реэкспортится из `lib/validations/page.ts` — Task 4 Step 1 определяет там, Step 3 реэкспортит ✅

**4. Неоднозначности:** миграции в Task 1 Step 5 — Prisma может объединить в одну; план допускает оба варианта явно.
