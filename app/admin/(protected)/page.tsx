import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Дашборд — Кофейня-пекарня",
};

// Наполнение дашборда (сводка за день/неделю, график продаж, топ товаров,
// уведомления — about-project.md, раздел "Страница административной панели",
// пункт 1) — отдельная задача (пункт 15 плана). Здесь только заглушка, чтобы
// маршрут /admin существовал и сайдбар (пункт 14) можно было проверить в браузере.
export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">
        Дашборд
      </h1>
      <p className="mt-4 font-venuscom text-body-sm text-black-olive/70">
        Сводка за день/неделю, график продаж и уведомления появятся в следующей задаче.
      </p>
    </div>
  );
}
