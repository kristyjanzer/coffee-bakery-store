// Playwright-раннер (в отличие от next dev) сам .env не читает — подхватываем его,
// чтобы локально ADMIN_EMAIL/ADMIN_PASSWORD совпали с тем, что засидил prisma db seed.
// В CI файла .env нет, dotenv тихо пропускает — переменные там уже в env job'ы.
import "dotenv/config";
import { test, expect } from "@playwright/test";

// Сквозной сценарий, шаг 5 (docs/plan.md, пункт 36): гость оформляет заявку →
// админ входит в панель → видит эту заявку в списке заказов.
// Дополняет e2e/checkout-flow.spec.ts (шаги 1–4).

const CATEGORY_NAME = "Выпечка";
const PRODUCT_NAME = "Грилата с брынзой и зеленью";

// Учётка админа — та же, что создаёт prisma/seed.ts из ADMIN_EMAIL/ADMIN_PASSWORD.
// Локально приходит из .env, в CI — из env-блока e2e job (.github/workflows/ci.yml).
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@test.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "test-admin-password";

test("гость оформляет заявку → админ видит её в списке заказов", async ({ page }) => {
  // Сценарий длинный (витрина → корзина → API заказа → вход → админка), а dev-сервер
  // компилирует каждый роут при первом обращении — дефолтных 30 c не хватает.
  test.setTimeout(120_000);

  // Имя с меткой времени — уникально между прогонами, легко находится в таблице.
  const customerName = `E2E Клиент ${Date.now()}`;

  // 1–4. Оформление заявки (селекторы 1-в-1 из e2e/checkout-flow.spec.ts).
  await page.goto("/");
  await page.getByRole("tab", { name: CATEGORY_NAME }).click();
  const productCard = page.locator("article", { hasText: PRODUCT_NAME });
  await productCard.getByRole("button", { name: "Добавить в корзину" }).click();

  // Дожидаемся счётчика — товар точно в корзине, стор обновился.
  await expect(productCard.getByRole("button", { name: "Увеличить количество" })).toBeVisible();

  await page.getByRole("button", { name: "Открыть корзину" }).click();
  const modal = page.getByRole("dialog");
  await expect(modal).toHaveAttribute("aria-label", "Корзина");

  await modal.getByRole("button", { name: "Оформить заказ" }).click();
  await expect(modal).toHaveAttribute("aria-label", "Оформление заказа");

  await modal.getByLabel("Имя").fill(customerName);
  await modal.getByLabel("Телефон").fill("9008887766");
  await modal.getByLabel("Email (пришлем чек об оплате)").fill("e2e@example.com");
  // Согласие на обработку персональных данных — без него кнопка неактивна.
  await modal.getByRole("checkbox").check();
  await modal.getByRole("button", { name: "Отправить заявку" }).click();

  // Запас по времени: dev-сервер компилирует роут POST /api/orders при первом
  // обращении, это дольше дефолтных 5 c ожидания ассерта.
  await expect(modal).toHaveAttribute("aria-label", "Заявка принята", { timeout: 20_000 });

  // 5. Вход в админку через форму логина (components/admin/LoginForm.tsx).
  await page.goto("/pekarnya-control/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Пароль").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();

  // Успешный вход уводит с формы логина на дашборд (router.replace в LoginForm).
  // Ждём именно ухода с /login — иначе следующий goto может опередить установку
  // сессионной куки, и proxy.ts вернёт нас обратно на логин.
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 20_000 });

  // 6. Заявка видна в списке заказов (сортировка createdAt desc — новый заказ сверху).
  await page.goto("/pekarnya-control/orders");
  await expect(page.getByRole("heading", { name: "Заказы" })).toBeVisible({ timeout: 15_000 });
  const row = page.locator("tr", { hasText: customerName });
  await expect(row).toBeVisible();
});

// Smoke-тест всех разделов админки: ловит регрессии сборки бандла — например
// серверный модуль (Prisma-рантайм через @/lib/prisma), утёкший в клиентский
// компонент, ронял /pekarnya-control/settings с "Module not found: Can't resolve 'fs'".
test("все разделы админки открываются под ADMIN", async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto("/pekarnya-control/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Пароль").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 20_000 });

  const sections: [string, string][] = [
    ["/pekarnya-control", "Дашборд"],
    ["/pekarnya-control/orders", "Заказы"],
    ["/pekarnya-control/products", "Товары"],
    ["/pekarnya-control/customers", "Клиенты"],
    ["/pekarnya-control/reviews", "Отзывы"],
    ["/pekarnya-control/pages", "Управление страницами"],
    ["/pekarnya-control/settings", "Настройки"],
  ];
  for (const [path, heading] of sections) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible({ timeout: 15_000 });
  }
});
