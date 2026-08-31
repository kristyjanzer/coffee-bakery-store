import { test, expect } from "@playwright/test";

// Сквозной сценарий (docs/plan.md, пункт 36): каталог → корзина → заявка.
// submitOrder() (lib/api-client/orders.ts) теперь делает реальный fetch("/api/orders") и
// пишет заказ в БД (задача 66), а /pekarnya-control/* защищён proxy.ts (задача 61).
// Шаг 5 плана (заявка видна в списке заказов админки после входа) вынесен в
// отдельный спек e2e/admin-order.spec.ts.

// Формула 1-в-1 из lib/utils.ts formatPrice() — считаем ожидаемую сумму тем же
// способом, что и сама страница, а не хардкодим строку с разделителем разрядов
// (toLocaleString может вставлять обычный пробел или NBSP в зависимости от ICU).
function formatPrice(price: number): string {
  return `${price.toLocaleString("ru-RU")} ₽`;
}

const CATEGORY_NAME = "Выпечка";
const PRODUCT_NAME = "Грилата с брынзой и зеленью";
const PRODUCT_PRICE = 180;

test("каталог → добавление в корзину → изменение количества → оформление заявки", async ({
  page,
}) => {
  // Сценарий длинный (витрина → корзина → API заказа), а dev-сервер компилирует
  // каждый роут при первом обращении — дефолтных 30 c на тест не всегда хватает
  // при параллельном прогоне с остальными спеками. Тот же запас, что в
  // e2e/admin-order.spec.ts.
  test.setTimeout(120_000);

  await page.goto("/");

  // 1. Переход по табу категории
  await page.getByRole("tab", { name: CATEGORY_NAME }).click();
  const productCard = page.locator("article", { hasText: PRODUCT_NAME });
  await expect(productCard.getByRole("heading", { name: PRODUCT_NAME })).toBeVisible();

  // 2. Добавление товара в корзину, изменение количества через счётчик
  await productCard.getByRole("button", { name: "Добавить в корзину" }).click();
  await expect(productCard.getByRole("button", { name: "Увеличить количество" })).toBeVisible();
  await productCard.getByRole("button", { name: "Увеличить количество" }).click();
  await expect(productCard.getByText("2", { exact: true })).toBeVisible();

  // 3. Открытие виджета корзины, проверка итоговой суммы
  await page.getByRole("button", { name: "Открыть корзину" }).click();
  const modal = page.getByRole("dialog");
  await expect(modal).toHaveAttribute("aria-label", "Корзина");
  await expect(modal).toContainText(PRODUCT_NAME);
  await expect(modal).toContainText("Итого");
  await expect(modal).toContainText(formatPrice(PRODUCT_PRICE * 2));

  // 4. Оформление заявки (форма без оплаты)
  await modal.getByRole("button", { name: "Оформить заказ" }).click();
  await expect(modal).toHaveAttribute("aria-label", "Оформление заказа");

  await modal.getByLabel("Имя").fill("Тест Тестов");
  await modal.getByLabel("Телефон").fill("9001234567");
  await modal.getByLabel("Email (пришлем чек об оплате)").fill("test@example.com");
  await modal.getByRole("button", { name: "Отправить заявку" }).click();

  // Запас по времени: dev-сервер компилирует роут POST /api/orders при первом
  // обращении, это дольше дефолтных 5 c ожидания ассерта (см. e2e/admin-order.spec.ts).
  await expect(modal).toHaveAttribute("aria-label", "Заявка принята", { timeout: 20_000 });
  await expect(modal).toContainText("Спасибо! Мы получили вашу заявку");
});
