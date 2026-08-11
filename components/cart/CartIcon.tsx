import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";

// Счётчик товаров и обработчик клика (открытие CartWidget) добавятся вместе
// с cartStore — docs/plan.md, пункты 8-10. Пока это статичная иконка.
export function CartIcon() {
  return (
    <button type="button" aria-label="Корзина" className="text-warm-cream">
      <FontAwesomeIcon icon={faCartShopping} className="h-5 w-5" />
    </button>
  );
}
