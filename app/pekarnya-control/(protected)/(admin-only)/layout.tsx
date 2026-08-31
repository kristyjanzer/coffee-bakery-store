import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth";

// Разделы «Управление страницами» и «Настройки» — только для роли ADMIN
// (docs/plan.md, пункты 20-21; управление админ-юзерами и настройками
// чувствительно). ORDER_MANAGER перенаправляется на дашборд. Проверка дублирует
// role-гейт в API-роутах (defense-in-depth) — route group на URL не влияет.
export default async function AdminOnlyLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/pekarnya-control");
  }
  return <>{children}</>;
}
