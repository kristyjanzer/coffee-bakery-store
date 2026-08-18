import { test, expect } from "@playwright/test";

// Сквозной сценарий (docs/plan.md, пункт 36): каталог → корзина → заявка.
// Шаг 5 плана (заявка появляется в списке заказов админки, с авторизацией) сюда
// намеренно не входит: submitOrder() (lib/orders.ts) — заглушка, не пишет в
// MOCK_ORDERS, а /pekarnya-control/* ещё не защищён middleware.ts (пункты 22-35
// плана не реализованы) — доедет отдельной задачей, когда появится реальный backend.

// Формула 1-в-1 из lib/utils.ts formatPrice() — считаем ожидаемую сумму тем же
// способом, что и сама страница, а не хардкодим строку с разделителем разрядов
// (toLocaleString может вставлять обычный пробел или NBSP в зависимости от ICU).
function formatPrice(price: number): string {
  return `${price.toLocaleString("ru-RU")} ₽`;
}

const CATEGORY_NAME = "Выпечка";
const PRODUCT_NAME = "Грилата с брынзой и зеленью";
const PRODUCT_PRICE = 540;

test("каталог → добавление в корзину → изменение количества → оформление заявки", async ({
  page,
}) => {
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

  await expect(modal).toHaveAttribute("aria-label", "Заявка принята");
  await expect(modal).toContainText("Спасибо! Мы получили вашу заявку");
});
