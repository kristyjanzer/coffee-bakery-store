import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPolicyPage from "@/app/(site)/privacy-policy/page";

describe("Страница «Политика конфиденциальности»", () => {
  it("рендерит заголовок, дату обновления и разделы политики", () => {
    render(<PrivacyPolicyPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Политика конфиденциальности" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Дата последнего обновления/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "2. Какие данные мы собираем" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "10. Изменения политики" })
    ).toBeInTheDocument();
  });
});
