import type { ReactNode } from "react";
import { Sidebar } from "@/components/admin/Sidebar";

// Route group — на URL не влияет (app/pekarnya-control/(protected)/page.tsx → /pekarnya-control, как
// app/(site)/page.tsx → /), но не даёт этому layout оборачивать /pekarnya-control/login
// (пункт 13 плана: страница логина публична и без сайдбара). Тот же приём, что
// в app/(site)/layout.tsx для Header/Footer.
export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar />
      {/* min-w-0 обязателен: флекс-элемент без него не может сжаться уже
          min-content своих потомков (браузерный дефолт min-width: auto) — с
          широкой таблицей внутри (например, /pekarnya-control/customers, все колонки
          whitespace-nowrap) main раздувался шире отведённого места и скроллилась
          вся страница вместо внутреннего overflow-x-auto у самой таблицы. */}
      <main className="min-h-screen min-w-0 flex-1 bg-warm-cream p-6 lg:p-10">{children}</main>
    </div>
  );
}
