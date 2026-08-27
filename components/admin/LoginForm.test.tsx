import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/admin/LoginForm";

const signInMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({ signIn: signInMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
}));

beforeEach(() => {
  signInMock.mockReset();
  replaceMock.mockReset();
  refreshMock.mockReset();
});

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "admin@example.com");
  await user.type(screen.getByLabelText("Пароль"), "secret123");
  await user.click(screen.getByRole("button", { name: "Войти" }));
}

describe("LoginForm", () => {
  it("не зовёт signIn, если клиентская валидация не прошла (пустой email)", async () => {
    const user = userEvent.setup();
    render(<LoginForm callbackUrl="/pekarnya-control" />);

    await user.type(screen.getByLabelText("Пароль"), "secret123");
    await user.click(screen.getByRole("button", { name: "Войти" }));

    // Сообщение задаёт общая loginFormSchema (для "" срабатывает проверка .email()).
    expect(screen.getByText("Некорректный email")).toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("при верных данных зовёт signIn и уводит на callbackUrl", async () => {
    signInMock.mockResolvedValueOnce({ ok: true, error: null });
    const user = userEvent.setup();
    render(<LoginForm callbackUrl="/pekarnya-control/orders" />);

    await fillAndSubmit(user);

    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "admin@example.com",
      password: "secret123",
      redirect: false,
    });
    expect(replaceMock).toHaveBeenCalledWith("/pekarnya-control/orders");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("при неверных данных показывает ошибку и не редиректит", async () => {
    signInMock.mockResolvedValueOnce({ ok: false, error: "CredentialsSignin" });
    const user = userEvent.setup();
    render(<LoginForm callbackUrl="/pekarnya-control" />);

    await fillAndSubmit(user);

    expect(await screen.findByText("Неверный email или пароль")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
