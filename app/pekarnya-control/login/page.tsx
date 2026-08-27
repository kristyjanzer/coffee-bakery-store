import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Вход администратора — Coffee Bakery",
};

interface AdminLoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

// Пускаем возврат только на внутренние пути админки — защита от open redirect
// через ?callbackUrl=https://evil.example или //evil.example.
function safeCallbackUrl(raw: string | undefined): string {
  if (raw && raw.startsWith("/pekarnya-control") && !raw.startsWith("//")) {
    return raw;
  }
  return "/pekarnya-control";
}

// Публичная страница (docs/architecture.md, раздел 2): единственная точка входа
// в /pekarnya-control/*, которую proxy.ts (пункт 32 плана) не защищает — withAuth
// пропускает её сам как pages.signIn. callbackUrl читаем на сервере и отдаём в
// форму пропом, чтобы не тащить useSearchParams + Suspense в клиент.
export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { callbackUrl } = await searchParams;

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
          <LoginForm callbackUrl={safeCallbackUrl(callbackUrl)} />
        </div>
      </div>
    </div>
  );
}
