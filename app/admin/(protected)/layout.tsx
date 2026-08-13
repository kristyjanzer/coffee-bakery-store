import type { ReactNode } from "react";
import { Sidebar } from "@/components/admin/Sidebar";

// Route group — на URL не влияет (app/admin/(protected)/page.tsx → /admin, как
// app/(site)/page.tsx → /), но не даёт этому layout оборачивать /admin/login
// (пункт 13 плана: страница логина публична и без сайдбара). Тот же приём, что
// в app/(site)/layout.tsx для Header/Footer.
export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar />
      <main className="min-h-screen flex-1 bg-warm-cream p-6 lg:p-10">{children}</main>
    </div>
  );
}
