const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatPrice(price: number, currency = "RUB"): string {
  const symbol = currency === "RUB" ? "₽" : currency;
  return `${price.toLocaleString("ru-RU")} ${symbol}`;
}

// next/link не всегда доводит скролл до конца при переходе по якорю в пределах
// той же страницы (известная особенность Next.js App Router) — прокручиваем сами.
// scroll-margin-top (утилита scroll-mt-*) на целевом элементе учитывается автоматически.
export function scrollToId(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Маска телефона для формы заявки (components/cart/CheckoutForm.tsx): всегда
// код страны "+7", "8" в начале ввода считаем тем же кодом (привычно для РФ).
// Источник правды — только цифры из value; сам формат пересобирается на каждый
// ввод, а не редактируется по месту — курсор при этом всегда уходит в конец
// строки (упрощение, точное позиционирование курсора внутри маски не нужно
// для объёма этого проекта).
export function formatPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (!digits) return "";

  if (digits[0] === "8") digits = `7${digits.slice(1)}`;
  else if (digits[0] !== "7") digits = `7${digits}`;
  digits = digits.slice(0, 11);

  const rest = digits.slice(1);
  const part1 = rest.slice(0, 3);
  const part2 = rest.slice(3, 6);
  const part3 = rest.slice(6, 8);
  const part4 = rest.slice(8, 10);

  let result = "+7";
  if (part1) result += ` ${part1}`;
  if (part2) result += ` ${part2}`;
  if (part3) result += `-${part3}`;
  if (part4) result += `-${part4}`;

  return result;
}

// Восстановление прокрутки браузером/Next.js при возврате со страницы товара
// на каталог (кнопка "Назад") оказалось ненадёжным (страница /product/[id]
// рендерится динамически). Сохраняем прокрутку сами прямо перед переходом —
// вызывается из ProductCard, читается в Catalog.
export const CATALOG_SCROLL_KEY = "catalog-scroll-y";

export function saveCatalogScrollPosition(): void {
  sessionStorage.setItem(CATALOG_SCROLL_KEY, String(window.scrollY));
}
