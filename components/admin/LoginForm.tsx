"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { loginFormDefaultValues, loginFormSchema, type LoginFormValues } from "@/lib/validations/auth";

type FormErrors = Partial<Record<keyof LoginFormValues, string>>;

interface LoginFormProps {
  // Куда вернуть после успешного входа. Приходит из ?callbackUrl (его ставит
  // proxy.ts при редиректе неавторизованного) и уже провалидирован на сервере
  // как безопасный внутренний путь — см. login/page.tsx.
  callbackUrl: string;
}

// Форма логина администратора (docs/plan.md, пункты 13 и 31): email + пароль.
// Клиентская zod-валидация — тот же стек, что в CheckoutForm. Реальный вход —
// через signIn("credentials") из NextAuth (lib/auth/auth.ts).
export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<LoginFormValues>(loginFormDefaultValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Ошибка от NextAuth (неверные учётные данные) — на уровне всей формы, не поля.
  const [authError, setAuthError] = useState(false);

  function handleChange(field: keyof LoginFormValues, value: string) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    // Любая правка снимает общий баннер "неверный email или пароль".
    setAuthError(false);

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
    setAuthError(false);

    // redirect: false — разбираем результат сами: показываем ошибку инлайн, без
    // перезагрузки и без ухода на дефолтную страницу ошибки NextAuth.
    const result = await signIn("credentials", {
      email: loginValues.email,
      password: loginValues.password,
      redirect: false,
    });

    if (!result || result.error) {
      setAuthError(true);
      setIsSubmitting(false);
      return;
    }

    // replace (не push) — чтобы кнопка "назад" не возвращала на форму логина.
    // refresh() — сбросить серверный RSC-кэш, чтобы защищённые страницы
    // перерисовались уже с сессией.
    router.replace(callbackUrl);
    router.refresh();
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

      {authError && (
        <p className="font-venuscom text-caption font-semibold text-red-600">
          Неверный email или пароль
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Входим…" : "Войти"}
      </Button>
    </form>
  );
}
