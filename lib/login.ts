import type { LoginFormValues } from "@/lib/validations/auth";

// Заглушка: NextAuth Credentials-провайдер (docs/plan.md, пункт 31, lib/auth.ts —
// authOptions) ещё не существует — backend/Prisma/AdminUser появятся только в
// пунктах 22-36. Здесь только имитация сети, чтобы форма (пункт 13) была
// протестирована целиком. Сигнатура рассчитана на "тихую" замену на
// signIn("credentials", values) из next-auth/react без переделки LoginForm,
// как lib/orders.ts submitOrder() для заявки.
export function loginAdmin(values: LoginFormValues): Promise<{ success: true }> {
  void values;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 600);
  });
}
