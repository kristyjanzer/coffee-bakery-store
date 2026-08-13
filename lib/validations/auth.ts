import { z } from "zod";

// Поля совпадают с моделью AdminUser (docs/architecture.md, раздел 3: email +
// passwordHash) — когда появится NextAuth Credentials-провайдер (пункт 31 плана),
// схема подключится к нему без переименований, как orderFormSchema для заявки.
export const loginFormSchema = z.object({
  email: z.string().trim().min(1, "Укажите email").email("Некорректный email"),
  password: z.string().min(1, "Укажите пароль"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const loginFormDefaultValues: LoginFormValues = {
  email: "",
  password: "",
};
