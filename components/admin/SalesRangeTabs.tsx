import Link from "next/link";
import type { SalesRange } from "@/lib/dashboardStats";

const TABS: { range: SalesRange; label: string }[] = [
  { range: "days", label: "Дни" },
  { range: "weeks", label: "Недели" },
  { range: "months", label: "Месяцы" },
];

// Переключатель периода графика продаж на дашборде (about-project.md, пункт 1 —
// "по дням/неделям/месяцам"). Обычные ссылки с ?range=, без клиентского JS —
// тот же приём, что табы в /pekarnya-control/pages.
export function SalesRangeTabs({ active }: { active: SalesRange }) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {TABS.map((tab) => (
        <Link
          key={tab.range}
          href={tab.range === "days" ? "/pekarnya-control" : `/pekarnya-control?range=${tab.range}`}
          role="tab"
          aria-selected={active === tab.range}
          className={
            active === tab.range
              ? "rounded-sm border border-forest-ink px-3 py-1.5 font-venuscom text-caption uppercase text-forest-ink"
              : "rounded-sm border border-transparent px-3 py-1.5 font-venuscom text-caption uppercase text-black-olive/60 hover:text-black-olive"
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
