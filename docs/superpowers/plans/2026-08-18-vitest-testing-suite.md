# Vitest Testing Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Vitest + React Testing Library test suite covering the Zustand cart store, the existing payload-validation/business-logic layer, and three key catalog/cart components — with zero changes to existing production code.

**Architecture:** Greenfield test setup (no test infra exists today). Tests are co-located next to the file they cover (`cartStore.ts` → `cartStore.test.ts`), run via `vitest` in `jsdom` environment, using explicit `import { describe, it, expect } from "vitest"` (no global injection) so ESLint doesn't need a config change. Because this is testing **already-implemented** code (not new feature work), each task's test-writing step is followed directly by a **run-and-expect-PASS** step, not the red→green TDD cycle — a failure here means either a bug in the plan's test code (fix the test) or a genuine bug in production code (STOP, do not weaken the assertion, report it).

**Tech Stack:** Vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom, @vitejs/plugin-react, @vitest/coverage-v8. Package manager: npm (only `package-lock.json` present).

**Spec:** User request (this conversation) — priorities: 1) Zustand cart store, 2) API-route-equivalent payload validation/business logic, 3) ProductCard / QtyStepper / CartWidget components.

## Scope correction (read before starting)

The user's priority tier 2 was written as "API routes that are already implemented (Prisma queries, payload validation)". **Investigation found `app/api/**` contains only empty directories — zero `route.ts` files exist anywhere in the repo, and `prisma/schema.prisma` has no models.** There is nothing under `app/api` to test. The closest existing equivalent — the actual payload-validation and business-logic layer the future API routes will wrap — is:
- `lib/validations/*.ts` (Zod schemas: `orderFormSchema`, `productFormSchema`, `loginFormSchema`) — this **is** the payload validation the user asked for.
- `lib/orders.ts` (`submitOrder`, `getOrders`, `getOrderById`, `getCustomerOrderHistory`, `updateOrderStatus`) — async, will become Prisma-backed route handlers without signature changes (per its own comments).
- `lib/menu.ts` (`getCatalog`, `getProductById`) — same pattern, the pre-Prisma read layer that both the catalog and `CartWidget` depend on today.

Tasks 2-6 below substitute this layer for "API routes". This is flagged again in the final report to the user — do not silently reinterpret without telling them.

## Global Constraints

- No `any` in TypeScript; `strict: true` stays on (`.agents/rules/code-style.md`).
- Tailwind-only styling — not relevant here (test files have no markup of their own).
- `npm run lint` and `npx tsc --noEmit` must both be clean before any commit that "finishes" a task.
- **Never modify or delete existing test files** — there are none today, but this rule still governs any test written by a previous task in this same plan: only add.
- **Never weaken an assertion to make a test pass.** If a test fails against real production code and the test itself is correct, STOP and report the discrepancy instead of fixing it.
- Work happens on branch `test/vitest-core-coverage` (per `docs/git-flow.md`, type `test/`), created from `main`. Never commit to `main`.
- Commit per task (or per logical sub-step within a task), Conventional Commits format, scope from `docs/git-flow.md`'s table (`test`, `cart`, `orders`, `catalog`, `chore`, `docs`).
- Package manager is npm — use `npm install -D <pkg>`.

---

### Task 0: Branch + Vitest/RTL install + config

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json` (scripts + devDependencies — devDependencies get written by `npm install -D`, don't hand-edit them)

**Interfaces:**
- Produces: `vitest.config.ts` resolving `@/*` → repo root (mirrors `tsconfig.json`'s `paths`), `jsdom` environment, `vitest.setup.ts` as `setupFiles`. All later tasks' test files rely on this — `@/...` imports and `expect(...).toBeInTheDocument()` etc. only work once this task is committed.

- [ ] **Step 1: Check git status and create the branch**

```bash
git status
git checkout main
git pull
git checkout -b test/vitest-core-coverage
```

If `git status` shows uncommitted changes that aren't yours to discard, stop and ask before switching branches.

- [ ] **Step 2: Install dependencies**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 4: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// next/link подписывается на IntersectionObserver для prefetch при появлении
// ссылки во вьюпорте — в jsdom его нет, без заглушки рендер Link падает.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: IntersectionObserverStub,
});
```

- [ ] **Step 5: Add npm scripts**

In `package.json`, inside `"scripts"`, add (keep every existing script untouched):

```json
"test": "vitest run",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 6: Verify the harness runs with zero test files**

```bash
npm run test
```

Expected: Vitest starts, reports "No test files found" (or exits 0) — confirms config/alias/jsdom wiring works before any real test is added. Do not proceed to Task 1 if this errors.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts vitest.setup.ts package.json package-lock.json
git commit -m "chore(deps): добавить Vitest + React Testing Library"
```

---

### Task 1: Cart store unit tests

**Files:**
- Create: `stores/cartStore.test.ts`

**Interfaces:**
- Consumes: `useCartStore`, `selectTotalCount`, `selectTotalPrice`, `CartItem` from `stores/cartStore.ts` (read at [stores/cartStore.ts](../../../stores/cartStore.ts) — signatures already final, no changes needed).

- [ ] **Step 1: Write `stores/cartStore.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore, selectTotalCount, selectTotalPrice, type CartItem } from "@/stores/cartStore";

const espresso: Omit<CartItem, "quantity"> = {
  productId: 1,
  name: "Эспрессо",
  price: 200,
  imageUrl: "",
  unit: "",
};

const croissant: Omit<CartItem, "quantity"> = {
  productId: 2,
  name: "Круассан",
  price: 150,
  imageUrl: "",
  unit: "60 г",
};

beforeEach(() => {
  useCartStore.setState({ items: [], isWidgetOpen: false });
  localStorage.clear();
});

describe("cartStore addItem", () => {
  it("добавляет новый товар с quantity 1", () => {
    useCartStore.getState().addItem(espresso);
    expect(useCartStore.getState().items).toEqual([{ ...espresso, quantity: 1 }]);
  });

  it("увеличивает quantity, если товар уже в корзине", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(espresso);
    expect(useCartStore.getState().items).toEqual([{ ...espresso, quantity: 2 }]);
  });

  it("не путает разные товары друг с другом", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(croissant);
    expect(useCartStore.getState().items).toHaveLength(2);
  });
});

describe("cartStore removeItem", () => {
  it("удаляет товар по productId", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(croissant);
    useCartStore.getState().removeItem(espresso.productId);
    expect(useCartStore.getState().items).toEqual([{ ...croissant, quantity: 1 }]);
  });

  it("не падает, если товара с таким id нет", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().removeItem(999);
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});

describe("cartStore incrementQty / decrementQty", () => {
  it("incrementQty увеличивает quantity на 1", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().incrementQty(espresso.productId);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("decrementQty уменьшает quantity на 1", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().incrementQty(espresso.productId);
    useCartStore.getState().decrementQty(espresso.productId);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it("decrementQty убирает товар из items, когда quantity доходит до 0", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().decrementQty(espresso.productId);
    expect(useCartStore.getState().items).toEqual([]);
  });
});

describe("cartStore clearCart / openWidget / closeWidget", () => {
  it("clearCart опустошает items", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(croissant);
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("openWidget/closeWidget переключают isWidgetOpen", () => {
    useCartStore.getState().openWidget();
    expect(useCartStore.getState().isWidgetOpen).toBe(true);
    useCartStore.getState().closeWidget();
    expect(useCartStore.getState().isWidgetOpen).toBe(false);
  });
});

describe("selectTotalCount / selectTotalPrice", () => {
  it("selectTotalCount суммирует quantity всех товаров", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(croissant);
    expect(selectTotalCount(useCartStore.getState())).toBe(3);
  });

  it("selectTotalPrice суммирует price * quantity по всем товарам", () => {
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(espresso);
    useCartStore.getState().addItem(croissant);
    expect(selectTotalPrice(useCartStore.getState())).toBe(200 * 2 + 150 * 1);
  });

  it("для пустой корзины возвращают 0", () => {
    expect(selectTotalCount(useCartStore.getState())).toBe(0);
    expect(selectTotalPrice(useCartStore.getState())).toBe(0);
  });
});

describe("cartStore persist", () => {
  it("после addItem состояние сохраняется в localStorage под ключом cart-storage", () => {
    useCartStore.getState().addItem(espresso);
    const raw = localStorage.getItem("cart-storage");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.items).toEqual([{ ...espresso, quantity: 1 }]);
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```bash
npx vitest run stores/cartStore.test.ts
```

Expected: all tests PASS. If any fails, read the failure — this is existing code, so a failure here means either the test's expectation is wrong (fix the test) or a genuine bug (STOP and report, do not adjust the assertion to match broken behavior).

- [ ] **Step 3: Commit**

```bash
git add stores/cartStore.test.ts
git commit -m "test(cart): покрыть cartStore юнит-тестами (actions, селекторы, persist)"
```

---

### Task 2: `orderFormSchema` validation tests

**Files:**
- Create: `lib/validations/order.test.ts`

**Interfaces:**
- Consumes: `orderFormSchema`, `orderFormDefaultValues`, `OrderFormValues` from `lib/validations/order.ts`.

- [ ] **Step 1: Write `lib/validations/order.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { orderFormSchema, orderFormDefaultValues } from "@/lib/validations/order";

const validPayload = {
  customerName: "Анна Смирнова",
  customerContact: "+7 900 123-45-01",
  email: "anna@example.com",
  comment: "Без сахара",
  preferredDate: "",
};

describe("orderFormSchema — валидные данные", () => {
  it("принимает полностью заполненный валидный payload", () => {
    expect(orderFormSchema.safeParse(validPayload).success).toBe(true);
  });

  it("принимает пустые необязательные поля comment/preferredDate", () => {
    const result = orderFormSchema.safeParse({ ...validPayload, comment: "", preferredDate: "" });
    expect(result.success).toBe(true);
  });

  it("обрезает пробелы по краям customerName", () => {
    const result = orderFormSchema.safeParse({ ...validPayload, customerName: "  Анна  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerName).toBe("Анна");
    }
  });
});

describe("orderFormSchema — невалидные данные", () => {
  it("отклоняет слишком короткое имя", () => {
    expect(orderFormSchema.safeParse({ ...validPayload, customerName: "А" }).success).toBe(false);
  });

  it("отклоняет телефон с недописанными цифрами", () => {
    expect(orderFormSchema.safeParse({ ...validPayload, customerContact: "+7 900" }).success).toBe(false);
  });

  it("отклоняет некорректный email", () => {
    expect(orderFormSchema.safeParse({ ...validPayload, email: "not-an-email" }).success).toBe(false);
  });

  it("отклоняет пустой email", () => {
    expect(orderFormSchema.safeParse({ ...validPayload, email: "" }).success).toBe(false);
  });

  it("отклоняет comment длиннее 500 символов", () => {
    expect(orderFormSchema.safeParse({ ...validPayload, comment: "а".repeat(501) }).success).toBe(false);
  });
});

describe("orderFormDefaultValues", () => {
  it("не проходит валидацию как есть — обязательные поля пустые", () => {
    expect(orderFormSchema.safeParse(orderFormDefaultValues).success).toBe(false);
  });

  it("все значения по умолчанию — пустые строки", () => {
    expect(Object.values(orderFormDefaultValues).every((value) => value === "")).toBe(true);
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```bash
npx vitest run lib/validations/order.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add lib/validations/order.test.ts
git commit -m "test(orders): покрыть orderFormSchema валидными и невалидными payload"
```

---

### Task 3: `productFormSchema` validation tests

**Files:**
- Create: `lib/validations/product.test.ts`

**Interfaces:**
- Consumes: `productFormSchema`, `ProductFormParsed` from `lib/validations/product.ts`.

- [ ] **Step 1: Write `lib/validations/product.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { productFormSchema } from "@/lib/validations/product";

const validPayload = {
  name: "Капучино",
  categorySlug: "kofe",
  price: "270",
  stockQuantity: "10",
  imageUrl: "",
  volumeMl: "400",
  weightG: "",
  calories: "",
  description: "",
  composition: "",
  allergens: "",
  protein: "",
  fat: "",
  carbs: "",
  expiryInfo: "",
  isSeasonal: false,
  isActive: true,
};

describe("productFormSchema — валидные данные", () => {
  it("принимает валидный payload формы", () => {
    expect(productFormSchema.safeParse(validPayload).success).toBe(true);
  });

  it("приводит числовые строки к number", () => {
    const result = productFormSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(270);
      expect(result.data.stockQuantity).toBe(10);
      expect(result.data.volumeMl).toBe(400);
    }
  });

  it("пустая строка в необязательном числовом поле даёт undefined, а не ошибку", () => {
    const result = productFormSchema.safeParse({ ...validPayload, stockQuantity: "", volumeMl: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stockQuantity).toBeUndefined();
      expect(result.data.volumeMl).toBeUndefined();
    }
  });
});

describe("productFormSchema — невалидные данные", () => {
  it("отклоняет слишком короткое название", () => {
    expect(productFormSchema.safeParse({ ...validPayload, name: "К" }).success).toBe(false);
  });

  it("отклоняет пустую категорию", () => {
    expect(productFormSchema.safeParse({ ...validPayload, categorySlug: "" }).success).toBe(false);
  });

  it("отклоняет нулевую и отрицательную цену", () => {
    expect(productFormSchema.safeParse({ ...validPayload, price: "0" }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...validPayload, price: "-10" }).success).toBe(false);
  });

  it("отклоняет пустую цену (обязательное поле)", () => {
    expect(productFormSchema.safeParse({ ...validPayload, price: "" }).success).toBe(false);
  });

  it("отклоняет отрицательный stockQuantity", () => {
    expect(productFormSchema.safeParse({ ...validPayload, stockQuantity: "-5" }).success).toBe(false);
  });

  it("отклоняет нечисловую строку в числовом поле", () => {
    expect(productFormSchema.safeParse({ ...validPayload, price: "бесплатно" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```bash
npx vitest run lib/validations/product.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add lib/validations/product.test.ts
git commit -m "test(admin): покрыть productFormSchema валидными и невалидными payload"
```

---

### Task 4: `loginFormSchema` validation tests

**Files:**
- Create: `lib/validations/auth.test.ts`

**Interfaces:**
- Consumes: `loginFormSchema`, `loginFormDefaultValues` from `lib/validations/auth.ts`.

- [ ] **Step 1: Write `lib/validations/auth.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { loginFormSchema, loginFormDefaultValues } from "@/lib/validations/auth";

describe("loginFormSchema", () => {
  it("принимает валидные email и пароль", () => {
    expect(loginFormSchema.safeParse({ email: "admin@example.com", password: "secret123" }).success).toBe(true);
  });

  it("отклоняет некорректный email", () => {
    expect(loginFormSchema.safeParse({ email: "not-an-email", password: "secret123" }).success).toBe(false);
  });

  it("отклоняет пустой email", () => {
    expect(loginFormSchema.safeParse({ email: "", password: "secret123" }).success).toBe(false);
  });

  it("отклоняет пустой пароль", () => {
    expect(loginFormSchema.safeParse({ email: "admin@example.com", password: "" }).success).toBe(false);
  });

  it("обрезает пробелы по краям email", () => {
    const result = loginFormSchema.safeParse({ email: "  admin@example.com  ", password: "secret123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("admin@example.com");
    }
  });
});

describe("loginFormDefaultValues", () => {
  it("все поля — пустые строки", () => {
    expect(loginFormDefaultValues).toEqual({ email: "", password: "" });
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```bash
npx vitest run lib/validations/auth.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add lib/validations/auth.test.ts
git commit -m "test(auth): покрыть loginFormSchema валидными и невалидными payload"
```

---

### Task 5: `lib/orders.ts` business-logic tests

**Files:**
- Create: `lib/orders.test.ts`

**Interfaces:**
- Consumes: `getOrders`, `getOrderById`, `getCustomerOrderHistory`, `submitOrder`, `updateOrderStatus`, `ORDER_STATUSES`, `OrderFormValues` (re-exported via `lib/validations/order.ts`, but the type used by `submitOrder`'s payload is imported from there directly) from `lib/orders.ts`; `CartItem` from `stores/cartStore.ts`.

- [ ] **Step 1: Write `lib/orders.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";
import {
  getOrders,
  getOrderById,
  getCustomerOrderHistory,
  submitOrder,
  updateOrderStatus,
  ORDER_STATUSES,
} from "@/lib/orders";
import type { OrderFormValues } from "@/lib/validations/order";
import type { CartItem } from "@/stores/cartStore";

describe("getOrders", () => {
  it("возвращает заказы, отсортированные от новых к старым (по minutesAgo)", async () => {
    const orders = await getOrders();
    expect(orders.length).toBeGreaterThan(0);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i].minutesAgo).toBeGreaterThanOrEqual(orders[i - 1].minutesAgo);
    }
  });

  it("фильтрует по статусу, если он передан", async () => {
    const newOrders = await getOrders("NEW");
    expect(newOrders.length).toBeGreaterThan(0);
    expect(newOrders.every((order) => order.status === "NEW")).toBe(true);
  });
});

describe("getOrderById", () => {
  it("находит заказ по существующему id", async () => {
    const order = await getOrderById(1042);
    expect(order?.customerName).toBe("Анна Смирнова");
  });

  it("возвращает undefined для несуществующего id", async () => {
    expect(await getOrderById(999999)).toBeUndefined();
  });
});

describe("getCustomerOrderHistory", () => {
  it("возвращает другие заказы того же клиента, кроме текущего", async () => {
    const history = await getCustomerOrderHistory("+7 900 123-45-01", 1042);
    expect(history.length).toBeGreaterThan(0);
    expect(history.every((order) => order.customerContact === "+7 900 123-45-01")).toBe(true);
    expect(history.some((order) => order.id === 1042)).toBe(false);
  });

  it("возвращает пустой массив для контакта без истории", async () => {
    expect(await getCustomerOrderHistory("+7 000 000-00-00", 1)).toEqual([]);
  });
});

describe("submitOrder", () => {
  it("резолвится с success: true", async () => {
    vi.useFakeTimers();
    const form: OrderFormValues = {
      customerName: "Тест Тестов",
      customerContact: "+7 900 000-00-00",
      email: "test@example.com",
      comment: "",
      preferredDate: "",
    };
    const items: CartItem[] = [
      { productId: 1, name: "Эспрессо", price: 200, imageUrl: "", quantity: 1, unit: "" },
    ];
    const pending = submitOrder({ form, items, totalPrice: 200 });
    await vi.advanceTimersByTimeAsync(600);
    await expect(pending).resolves.toEqual({ success: true });
    vi.useRealTimers();
  });
});

describe("updateOrderStatus", () => {
  it("резолвится с success: true", async () => {
    vi.useFakeTimers();
    const pending = updateOrderStatus(1042, "IN_PROGRESS");
    await vi.advanceTimersByTimeAsync(500);
    await expect(pending).resolves.toEqual({ success: true });
    vi.useRealTimers();
  });
});

describe("ORDER_STATUSES", () => {
  it("содержит все 6 статусов в ожидаемом порядке", () => {
    expect(ORDER_STATUSES).toEqual(["NEW", "IN_PROGRESS", "PREPARING", "READY", "DELIVERED", "CANCELLED"]);
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```bash
npx vitest run lib/orders.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add lib/orders.test.ts
git commit -m "test(orders): покрыть lib/orders.ts (getOrders, submitOrder, updateOrderStatus и т.д.)"
```

---

### Task 6: `lib/menu.ts` catalog data-layer tests

**Files:**
- Create: `lib/menu.test.ts`

**Interfaces:**
- Consumes: `getCatalog`, `getProductById`, `MenuProduct`, `MenuCategory` from `lib/menu.ts`.

- [ ] **Step 1: Write `lib/menu.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { getCatalog, getProductById } from "@/lib/menu";

describe("getCatalog", () => {
  it("возвращает непустой список категорий", () => {
    expect(getCatalog().length).toBeGreaterThan(0);
  });

  it("у каждой категории есть slug, name и непустой список products", () => {
    for (const category of getCatalog()) {
      expect(category.slug).toBeTruthy();
      expect(category.name).toBeTruthy();
      expect(category.products.length).toBeGreaterThan(0);
    }
  });

  it("маппит snake_case поля menu.json в camelCase MenuProduct", () => {
    const product = getCatalog()[0].products[0];
    expect(product).toHaveProperty("stockQuantity");
    expect(product).toHaveProperty("imageUrl");
    expect(product).not.toHaveProperty("stock_quantity");
  });
});

describe("getProductById", () => {
  it("находит товар по существующему id", () => {
    const anyProduct = getCatalog()[0].products[0];
    const found = getProductById(anyProduct.id);
    expect(found?.id).toBe(anyProduct.id);
    expect(found?.name).toBe(anyProduct.name);
  });

  it("возвращает undefined для несуществующего id", () => {
    expect(getProductById(-1)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```bash
npx vitest run lib/menu.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add lib/menu.test.ts
git commit -m "test(catalog): покрыть lib/menu.ts (getCatalog, getProductById)"
```

---

### Task 7: `ProductCard` component tests

**Files:**
- Create: `components/catalog/ProductCard.test.tsx`

**Interfaces:**
- Consumes: `ProductCard` from `components/catalog/ProductCard.tsx`, `MenuProduct` from `lib/menu.ts`, `useCartStore` from `stores/cartStore.ts`. Mocks `next/image`.

- [ ] **Step 1: Write `components/catalog/ProductCard.test.tsx`**

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "@/components/catalog/ProductCard";
import { useCartStore } from "@/stores/cartStore";
import type { MenuProduct } from "@/lib/menu";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const baseProduct: MenuProduct = {
  id: 1,
  name: "Капучино",
  price: 270,
  currency: "RUB",
  stockQuantity: 10,
  imageUrl: "",
  volumeMl: 400,
};

beforeEach(() => {
  useCartStore.setState({ items: [], isWidgetOpen: false });
  localStorage.clear();
});

describe("ProductCard", () => {
  it("рендерит название и отформатированную цену", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("Капучино")).toBeInTheDocument();
    expect(screen.getByText("270 ₽")).toBeInTheDocument();
  });

  it("показывает подпись объёма, когда указан volumeMl", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("400 мл")).toBeInTheDocument();
  });

  it("показывает подпись веса, когда указан weightG (и нет volumeMl)", () => {
    render(<ProductCard product={{ ...baseProduct, volumeMl: undefined, weightG: 220 }} />);
    expect(screen.getByText("220 г")).toBeInTheDocument();
  });

  it("не показывает подпись, если нет ни volumeMl, ни weightG", () => {
    render(<ProductCard product={{ ...baseProduct, volumeMl: undefined, weightG: undefined }} />);
    expect(screen.queryByText(/^\d+\s(мл|г)$/)).not.toBeInTheDocument();
  });

  it("обе ссылки карточки ведут на /product/:id", () => {
    render(<ProductCard product={baseProduct} />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(1);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/product/1"));
  });

  it("показывает плашку-заглушку, если imageUrl пустой", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("показывает изображение, если imageUrl задан", () => {
    render(<ProductCard product={{ ...baseProduct, imageUrl: "https://res.cloudinary.com/x.jpg" }} />);
    expect(screen.getByRole("img", { name: "Капучино" })).toBeInTheDocument();
  });

  it("клик по кнопке добавления кладёт товар в cartStore", async () => {
    const user = userEvent.setup();
    render(<ProductCard product={baseProduct} />);
    await user.click(screen.getByRole("button", { name: "Добавить в корзину" }));
    expect(useCartStore.getState().items).toEqual([
      { productId: 1, name: "Капучино", price: 270, imageUrl: "", quantity: 1, unit: "400 мл" },
    ]);
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```bash
npx vitest run components/catalog/ProductCard.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add components/catalog/ProductCard.test.tsx
git commit -m "test(catalog): покрыть ProductCard component-тестами"
```

---

### Task 8: `QtyStepper` component tests

**Files:**
- Create: `components/catalog/QtyStepper.test.tsx`

**Interfaces:**
- Consumes: `QtyStepper` from `components/catalog/QtyStepper.tsx`, `useCartStore` from `stores/cartStore.ts`. No `next/image`/`next/link` involved — no mocks needed.

- [ ] **Step 1: Write `components/catalog/QtyStepper.test.tsx`**

```tsx
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QtyStepper } from "@/components/catalog/QtyStepper";
import { useCartStore } from "@/stores/cartStore";

const baseProps = {
  productId: 1,
  name: "Эспрессо",
  price: 200,
  imageUrl: "",
  unit: "",
};

beforeEach(() => {
  useCartStore.setState({ items: [], isWidgetOpen: false });
  localStorage.clear();
});

describe("QtyStepper — товар не в корзине (count === 0)", () => {
  it("рендерит кнопку добавления", () => {
    render(<QtyStepper {...baseProps} max={10} />);
    expect(screen.getByRole("button", { name: "Добавить в корзину" })).toBeInTheDocument();
  });

  it("клик добавляет товар в корзину с quantity 1", async () => {
    const user = userEvent.setup();
    render(<QtyStepper {...baseProps} max={10} />);
    await user.click(screen.getByRole("button", { name: "Добавить в корзину" }));
    expect(useCartStore.getState().items).toEqual([{ ...baseProps, quantity: 1 }]);
  });
});

describe("QtyStepper — max <= 0 (нет в наличии)", () => {
  it("рендерит задизейбленную кнопку «Нет в наличии»", () => {
    render(<QtyStepper {...baseProps} max={0} />);
    expect(screen.getByRole("button", { name: "Нет в наличии" })).toBeDisabled();
  });
});

describe("QtyStepper — товар уже в корзине (count > 0)", () => {
  beforeEach(() => {
    useCartStore.getState().addItem(baseProps);
  });

  it("показывает текущее количество", () => {
    render(<QtyStepper {...baseProps} max={10} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("«+» увеличивает quantity", async () => {
    const user = userEvent.setup();
    render(<QtyStepper {...baseProps} max={10} />);
    await user.click(screen.getByRole("button", { name: "Увеличить количество" }));
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("«−» уменьшает quantity", async () => {
    useCartStore.getState().incrementQty(baseProps.productId);
    const user = userEvent.setup();
    render(<QtyStepper {...baseProps} max={10} />);
    await user.click(screen.getByRole("button", { name: "Уменьшить количество" }));
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it("«−» при quantity 1 убирает товар из корзины (без preventRemoveAtOne)", async () => {
    const user = userEvent.setup();
    render(<QtyStepper {...baseProps} max={10} />);
    await user.click(screen.getByRole("button", { name: "Уменьшить количество" }));
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("preventRemoveAtOne=true дизейблит «−» при quantity 1", () => {
    render(<QtyStepper {...baseProps} max={10} preventRemoveAtOne />);
    expect(screen.getByRole("button", { name: "Уменьшить количество" })).toBeDisabled();
  });

  it("«+» дизейблится при достижении max", () => {
    render(<QtyStepper {...baseProps} max={1} />);
    expect(screen.getByRole("button", { name: "Увеличить количество" })).toBeDisabled();
  });
});

describe("QtyStepper — variant cta", () => {
  it("показывает текст «В корзину», когда count === 0", () => {
    render(<QtyStepper {...baseProps} max={10} variant="cta" />);
    expect(screen.getByRole("button", { name: "Добавить в корзину" })).toHaveTextContent("В корзину");
  });

  it("показывает текст «Нет в наличии», когда max <= 0", () => {
    render(<QtyStepper {...baseProps} max={0} variant="cta" />);
    expect(screen.getByRole("button", { name: "Нет в наличии" })).toHaveTextContent("Нет в наличии");
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```bash
npx vitest run components/catalog/QtyStepper.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add components/catalog/QtyStepper.test.tsx
git commit -m "test(cart): покрыть QtyStepper component-тестами"
```

---

### Task 9: `CartWidget` component tests

**Files:**
- Create: `components/cart/CartWidget.test.tsx`

**Interfaces:**
- Consumes: `CartWidget` from `components/cart/CartWidget.tsx`, `useCartStore` from `stores/cartStore.ts`. Mocks `next/image` and `@/lib/menu`'s `getProductById` (real `menu.json` lookups aren't needed — `CartWidget` only uses it to read `stockQuantity` for `QtyStepper`'s `max`).

- [ ] **Step 1: Write `components/cart/CartWidget.test.tsx`**

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartWidget } from "@/components/cart/CartWidget";
import { useCartStore } from "@/stores/cartStore";
import type { MenuProduct } from "@/lib/menu";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("@/lib/menu", () => ({
  getProductById: (id: number): MenuProduct | undefined => {
    const products: Record<number, MenuProduct> = {
      1: { id: 1, name: "Эспрессо", price: 200, currency: "RUB", stockQuantity: 10, imageUrl: "" },
      2: { id: 2, name: "Круассан", price: 150, currency: "RUB", stockQuantity: 5, imageUrl: "" },
    };
    return products[id];
  },
}));

beforeEach(() => {
  useCartStore.setState({ items: [], isWidgetOpen: true });
  localStorage.clear();
});

describe("CartWidget — пустая корзина", () => {
  it("показывает «Корзина пуста»", () => {
    render(<CartWidget />);
    expect(screen.getByText("Корзина пуста")).toBeInTheDocument();
  });
});

describe("CartWidget — корзина с товарами", () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [
        { productId: 1, name: "Эспрессо", price: 200, imageUrl: "", quantity: 1, unit: "" },
        { productId: 2, name: "Круассан", price: 150, imageUrl: "", quantity: 1, unit: "60 г" },
      ],
      isWidgetOpen: true,
    });
  });

  it("рендерит товары и итоговую сумму", () => {
    render(<CartWidget />);
    expect(screen.getByText("Эспрессо")).toBeInTheDocument();
    expect(screen.getByText("Круассан")).toBeInTheDocument();
    expect(screen.getByText("Итого")).toBeInTheDocument();
    expect(screen.getByText("350 ₽")).toBeInTheDocument();
  });

  it("клик по кнопке удаления убирает конкретный товар из корзины", async () => {
    const user = userEvent.setup();
    render(<CartWidget />);
    await user.click(screen.getByRole("button", { name: "Убрать «Эспрессо» из корзины" }));
    expect(useCartStore.getState().items).toEqual([
      { productId: 2, name: "Круассан", price: 150, imageUrl: "", quantity: 1, unit: "60 г" },
    ]);
  });

  it("клик «Оформить заказ» переключает виджет на шаг checkout", async () => {
    const user = userEvent.setup();
    render(<CartWidget />);
    await user.click(screen.getByRole("button", { name: "Оформить заказ" }));
    expect(screen.getByRole("dialog", { name: "Оформление заказа" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```bash
npx vitest run components/cart/CartWidget.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add components/cart/CartWidget.test.tsx
git commit -m "test(cart): покрыть CartWidget component-тестами"
```

---

### Task 10: Full suite, lint/typecheck, docs, security review, push

**Files:**
- Modify: `docs/technologies.md` (append a short "Тестирование" section at the end — this file is treated as the original ТЗ elsewhere in the project's history and is normally left untouched, but the user explicitly asked for this addition in this task).
- Modify: `docs/architecture.md` (append a short "Тестирование" subsection right after the folder-structure code block, i.e. after the line `для учебного проекта такого масштаба разделение только усложнило бы деплой и разработку.` following the ` ``` ` fence — see [docs/architecture.md](../../architecture.md) lines 71-75).
- Modify: `docs/progress.md` (append `## Задача 44` entry — last entry today is `## Задача 43`).

- [ ] **Step 1: Run the full suite and coverage**

```bash
npm run test
npm run test:coverage
```

Expected: every test file from Tasks 1-9 passes. Coverage output is informational — no coverage threshold is being enforced, don't add one unless asked.

- [ ] **Step 2: Lint and typecheck**

```bash
npm run lint
npx tsc --noEmit
```

Both must be clean. If ESLint flags something in a test file (e.g. an unused import), fix the test file — never loosen `eslint.config.mjs` to work around it.

- [ ] **Step 3: Append to `docs/technologies.md`**

Add at the very end of the file, after the existing "Итоговый стек одним списком" block:

```markdown

## Тестирование

**Vitest + React Testing Library** — добавлены по запросу пользователя для покрытия
существующего функционала юнит- и component-тестами: `stores/cartStore.ts`, слой
валидации/бизнес-логики (`lib/validations/*.ts`, `lib/orders.ts`, `lib/menu.ts`) и ключевые
компоненты каталога/корзины (`ProductCard`, `QtyStepper`, `CartWidget`). Vitest выбран вместо
Jest — нативно работает с Vite-подобной ESM/TS сборкой без отдельного babel-конфига и
запускается заметно быстрее. Тесты лежат рядом с тестируемым файлом (`cartStore.ts` →
`cartStore.test.ts`), без отдельной папки `__tests__`.
```

- [ ] **Step 4: Append to `docs/architecture.md`**

Insert right after the closing ` ``` ` fence of the folder-structure block and its "Почему так просто" paragraph (after line 75 as read at plan-writing time):

```markdown

### Тестирование

Тесты (Vitest + React Testing Library) лежат рядом с тестируемым файлом:
`stores/cartStore.ts` → `stores/cartStore.test.ts`, `components/catalog/ProductCard.tsx` →
`components/catalog/ProductCard.test.tsx` и т.д. Отдельной папки `__tests__`/`tests` нет —
так тест всегда переезжает вместе с файлом при рефакторинге/переносе.
```

- [ ] **Step 5: Append to `docs/progress.md`**

Add a new `## Задача 44` section at the end, following the exact heading/section pattern used by the two preceding entries (prose paragraph, `**Изменённые/созданные файлы:**` bullet list, a "Проверено" line, `**Security review:**` paragraph):

```markdown

## Задача 44

По запросу пользователя добавлен тестовый контур (Vitest + React Testing Library) для уже
реализованного функционала — без изменения бизнес-логики. Приоритет 1 (cartStore) и приоритет 3
(ProductCard/QtyStepper/CartWidget) покрыты как в задаче. Приоритет 2 из запроса был
сформулирован как «API routes» — по факту `app/api/**` состоит из пустых директорий (роуты
ещё не реализованы, Prisma-схема без моделей), поэтому вместо них покрыт фактический
слой валидации/бизнес-логики, который эти роуты будут оборачивать: `lib/validations/*.ts`
(Zod-схемы), `lib/orders.ts`, `lib/menu.ts`.

**Изменённые/созданные файлы:**
- `vitest.config.ts`, `vitest.setup.ts` — созданы (конфиг Vitest, jsdom, alias `@`, IntersectionObserver-заглушка для next/link)
- `package.json` — добавлены devDependencies (vitest, @vitejs/plugin-react, jsdom, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, @vitest/coverage-v8) и скрипты `test`/`test:coverage`
- `stores/cartStore.test.ts` — создан
- `lib/validations/order.test.ts`, `lib/validations/product.test.ts`, `lib/validations/auth.test.ts` — созданы
- `lib/orders.test.ts`, `lib/menu.test.ts` — созданы
- `components/catalog/ProductCard.test.tsx`, `components/catalog/QtyStepper.test.tsx`, `components/cart/CartWidget.test.tsx` — созданы
- `docs/technologies.md` — добавлен раздел «Тестирование»
- `docs/architecture.md` — добавлен подраздел «Тестирование» (конвенция расположения файлов)

Проверено: `npm run test`, `npm run lint`, `npx tsc --noEmit` — чисто.

**Security review:** применялся (`.claude/skills/security-review`) — задача добавляет только
тесты для уже существующего кода, auth/секреты/новые API-эндпоинты не затрагивались.
```

- [ ] **Step 6: Commit docs**

```bash
git add docs/technologies.md docs/architecture.md docs/progress.md
git commit -m "docs: описать тестовый контур в technologies.md, architecture.md, progress.md"
```

- [ ] **Step 7: Run security-review skill**

Follow `.claude/skills/security-review/SKILL.md` before declaring the task done (required by `AGENTS.md`'s completion checklist). Given this task only adds test files against existing code, expect no findings — but run it, don't assume.

- [ ] **Step 8: Push the branch**

```bash
git push -u origin test/vitest-core-coverage
```

Per `docs/git-flow.md` §0: push is expected at completion, but **do not create a PR or merge** without the user's explicit "Да, сливай".

- [ ] **Step 9: Final report to the user**

Per `docs/git-flow.md` §6: branch name + `git log main..test/vitest-core-coverage --oneline`, list of changed/added files, 2-4 bullet summary, note the tier-2 scope substitution again, and the direct question: create a PR, or does the user want to review first?

---

## Self-Review Notes

- **Spec coverage:** Tier 1 (cart store) → Task 1. Tier 2 (API routes, substituted per the flagged scope correction) → Tasks 2-6. Tier 3 (ProductCard, QtyStepper, CartWidget) → Tasks 7-9. Install + npm scripts → Task 0. Docs stack update → Task 10. All covered.
- **No placeholders:** every task has complete, runnable test code — none deferred to "similar to Task N".
- **Type/signature consistency checked against actually-read source**: `CartItem`, `useCartStore` action names, `QtyStepper` prop names (`preventRemoveAtOne`, `variant`), `orderFormSchema`/`productFormSchema`/`loginFormSchema` field names, `lib/orders.ts` export names, `getProductById`/`getCatalog` from `lib/menu.ts`, `Modal`'s `role="dialog"` + `aria-label={title}` — all copied from files read during planning, not guessed.
