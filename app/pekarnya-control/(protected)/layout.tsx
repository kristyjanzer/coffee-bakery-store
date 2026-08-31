import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth";
import { Sidebar } from "@/components/admin/Sidebar";
import { AdminSessionProvider } from "@/components/admin/AdminSessionProvider";

// Route group — на URL не влияет (app/pekarnya-control/(protected)/page.tsx → /pekarnya-control, как
// app/(site)/page.tsx → /), но не даёт этому layout оборачивать /pekarnya-control/login
// (пункт 13 плана: страница логина публична и без сайдбара). Тот же приём, что
// в app/(site)/layout.tsx для Header/Footer.
//
// Проверка сессии здесь дублирует proxy.ts (пункт 32) намеренно:
// 1) defense-in-depth — страницы не отрендерятся без сессии, даже если запрос
//    как-то минует proxy;
// 2) getServerSession читает cookie → рендер становится динамическим и ответы
//    уходят с `Cache-Control: no-store`. Без этого после «Выйти» браузер показывал
//    закэшированную страницу админки по кнопке «назад» (bfcache).
export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/pekarnya-control/login");
  }

  return (
    <AdminSessionProvider>
      <div className="lg:flex lg:min-h-screen">
        <Sidebar isAdmin={session?.user?.role === "ADMIN"} />
        {/* min-w-0 обязателен: флекс-элемент без него не может сжаться уже
            min-content своих потомков (браузерный дефолт min-width: auto) — с
            широкой таблицей внутри (например, /pekarnya-control/customers, все колонки
            whitespace-nowrap) main раздувался шире отведённого места и скроллилась
            вся страница вместо внутреннего overflow-x-auto у самой таблицы. */}
        <main className="min-h-screen min-w-0 flex-1 bg-warm-cream p-6 lg:p-10">{children}</main>
      </div>
    </AdminSessionProvider>
  );
}
