"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { loginFormDefaultValues, loginFormSchema, type LoginFormValues } from "@/lib/validations/auth";
import { loginAdmin } from "@/lib/login";

type FormErrors = Partial<Record<keyof LoginFormValues, string>>;

// Форма логина администратора (docs/plan.md, пункт 13): email + пароль.
// Валидация — тот же клиентский zod-стек, что и в CheckoutForm, без react-hook-form.
// loginAdmin() пока заглушка (реальная авторизация — пункт 31 плана), поэтому после
// успешной отправки показывается только placeholder-сообщение, без редиректа —
// защищённых страниц админки (пункт 15+) ещё нет.
export function LoginForm() {
  const [values, setValues] = useState<LoginFormValues>(loginFormDefaultValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  function handleChange(field: keyof LoginFormValues, value: string) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);

    // Снимаем ошибку поля "на лету", как только оно становится валидным — но только
    // если ошибка уже была показана (после неудачного submit), как в CheckoutForm.
    if (errors[field]) {
      const result = loginFormSchema.safeParse(nextValues);
      const stillInvalid = !result.success && result.error.issues.some((issue) => issue.path[0] === field);
      if (!stillInvalid) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = loginFormSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginFormValues;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    void submitLogin(result.data);
  }

  async function submitLogin(loginValues: LoginFormValues) {
    setIsSubmitting(true);
    await loginAdmin(loginValues);
    setIsSubmitting(false);
    setIsSuccess(true);
  }

  if (isSuccess) {
    return (
      <p className="font-venuscom text-body-sm text-black-olive">
        Вход выполнен (заглушка) — раздел администратора появится в следующих задачах.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="font-venuscom text-caption text-black-olive/70">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => handleChange("email", event.target.value)}
          placeholder="admin@example.com"
          className="mt-1"
          error={Boolean(errors.email)}
        />
        {errors.email && (
          <p className="mt-1 font-venuscom text-caption font-semibold text-red-600">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="font-venuscom text-caption text-black-olive/70">
          Пароль
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => handleChange("password", event.target.value)}
          placeholder="••••••••"
          className="mt-1"
          error={Boolean(errors.password)}
        />
        {errors.password && (
          <p className="mt-1 font-venuscom text-caption font-semibold text-red-600">{errors.password}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Входим…" : "Войти"}
      </Button>
    </form>
  );
}
