import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Вход администратора — Coffee Bakery",
};

// Публичная страница (docs/architecture.md, раздел 2): единственная точка входа
// в /admin/*, которую middleware.ts (пункт 32 плана) не должен защищать.
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black-olive px-4">
      <div className="w-full max-w-[25rem] bg-warm-cream p-[30px] text-black-olive">
        <p className="font-gabriela text-caption uppercase tracking-[0.04em] text-forest-ink">
          Coffee Bakery
        </p>
        <h1 className="mt-2 font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">
          Вход администратора
        </h1>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
