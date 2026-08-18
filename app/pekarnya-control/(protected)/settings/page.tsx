import type { Metadata } from "next";
import Link from "next/link";
import { getAdminUsers, getNotificationSettings } from "@/lib/settings";
import { AdminUsersManager } from "@/components/admin/AdminUsersManager";
import { NotificationSettingsForm } from "@/components/admin/NotificationSettingsForm";

export const metadata: Metadata = {
  title: "Настройки — Coffee Bakery",
};

type Tab = "users" | "notifications";

const TABS: { tab: Tab; label: string }[] = [
  { tab: "users", label: "Пользователи админки" },
  { tab: "notifications", label: "Уведомления" },
];

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

function isTab(value: string | undefined): value is Tab {
  return TABS.some((item) => item.tab === value);
}

// Раздел «Настройки» (docs/plan.md, пункт 21; about-project.md, раздел "Настройки"):
// пользователи админки и роли + настройки уведомлений. Табы — обычные ссылки с
// query-параметром (?tab=...), тот же приём, что в /pekarnya-control/pages и /pekarnya-control/reviews.
// В отличие от /pekarnya-control/pages (задача 36), здесь каждая вкладка рендерит свой тип
// компонента (AdminUsersManager/NotificationSettingsForm), а не один и тот же с
// разными пропами — React и так пересоздаёт состояние при смене типа, доп. key не нужен.
export default async function AdminSettingsPage({ searchParams }: SettingsPageProps) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab = isTab(rawTab) ? rawTab : "users";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">Настройки</h1>

      <div className="flex flex-wrap gap-3" role="tablist">
        {TABS.map((item) => (
          <Link
            key={item.tab}
            href={item.tab === "users" ? "/pekarnya-control/settings" : `/pekarnya-control/settings?tab=${item.tab}`}
            role="tab"
            aria-selected={tab === item.tab}
            className={
              tab === item.tab
                ? "rounded-sm border border-black-olive px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                : "rounded-sm border border-transparent px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive/60 shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:text-black-olive"
            }
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "notifications" ? <NotificationsTab /> : <UsersTab />}
    </div>
  );
}

async function UsersTab() {
  const users = await getAdminUsers();
  return <AdminUsersManager users={users} />;
}

async function NotificationsTab() {
  const settings = await getNotificationSettings();
  return <NotificationSettingsForm initialSettings={settings} />;
}
