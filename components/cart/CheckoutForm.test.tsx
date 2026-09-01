import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import type { CartItem } from "@/stores/cartStore";

const items: CartItem[] = [
  { productId: 1, name: "Эспрессо", price: 200, imageUrl: "", quantity: 2, unit: "" },
];

describe("CheckoutForm", () => {
  it("не зовёт onSubmit при незаполненной форме", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <CheckoutForm items={items} totalPrice={400} onSubmit={onSubmit} isSubmitting={false} />
    );

    await user.click(screen.getByRole("checkbox")); // согласие есть, но поля пустые
    await user.click(screen.getByRole("button", { name: "Отправить заявку" }));

    expect(screen.getByText("Укажите имя")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("зовёт onSubmit с валидными данными формы", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <CheckoutForm items={items} totalPrice={400} onSubmit={onSubmit} isSubmitting={false} />
    );

    await user.type(screen.getByLabelText("Имя"), "Анна");
    await user.type(screen.getByLabelText("Телефон"), "9001234501");
    await user.type(screen.getByLabelText("Email (пришлем чек об оплате)"), "anna@example.com");
    await user.click(screen.getByRole("checkbox")); // согласие с политикой конфиденциальности
    await user.click(screen.getByRole("button", { name: "Отправить заявку" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ customerName: "Анна", email: "anna@example.com" })
    );
  });

  it("кнопка «Отправить заявку» неактивна, пока не отмечено согласие с политикой", async () => {
    const user = userEvent.setup();
    render(
      <CheckoutForm items={items} totalPrice={400} onSubmit={vi.fn()} isSubmitting={false} />
    );

    expect(screen.getByRole("button", { name: "Отправить заявку" })).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("button", { name: "Отправить заявку" })).toBeEnabled();
  });

  it("слова «политикой конфиденциальности» ведут на /privacy-policy", () => {
    render(
      <CheckoutForm items={items} totalPrice={400} onSubmit={vi.fn()} isSubmitting={false} />
    );

    expect(
      screen.getByRole("link", { name: "политикой конфиденциальности" })
    ).toHaveAttribute("href", "/privacy-policy");
  });

  it("показывает ошибку сервера из пропа submitError", () => {
    render(
      <CheckoutForm
        items={items}
        totalPrice={400}
        onSubmit={vi.fn()}
        isSubmitting={false}
        submitError="Нет связи с сервером. Проверьте подключение и попробуйте ещё раз."
      />
    );

    expect(
      screen.getByText("Нет связи с сервером. Проверьте подключение и попробуйте ещё раз.")
    ).toBeInTheDocument();
  });
});
