import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping, faStar } from "@fortawesome/free-solid-svg-icons";
import { formatPrice, formatTimeAgo } from "@/lib/utils";
import type { Review } from "@/lib/shared/reviews";
import { ORDER_STATUS_LABELS } from "@/lib/api-client/orders";
import type {
  DashboardSummary,
  PendingOrder,
  SalesChartPoint,
  SalesRange,
  TopProduct,
} from "@/lib/server/dashboardStats";
import { SalesRangeTabs } from "./SalesRangeTabs";

interface DashboardProps {
  summary: DashboardSummary;
  salesChart: SalesChartPoint[];
  topProducts: TopProduct[];
  pendingOrders: PendingOrder[];
  reviews: Review[];
  range: SalesRange;
}

// Классы столбиков/полосок графиков — только литеральные строки, перечисленные прямо
// здесь (в components/**, которые сканирует Tailwind, см. tailwind.config.ts). Держать
// их в lib/server/dashboardStats.ts (данные) нельзя: там Tailwind их не увидит и не сгенерирует
// нужный CSS — ровно так это и сломалось при первой попытке. Высота/ширина подобраны
// по рангу значения в наборе, а не проценту (inline style запрещён code-style.md).
// 8 шагов — под максимум точек графика (вкладка «Недели» возвращает 8, «Дни» — 7,
// «Месяцы» — 6). Меньше шагов, чем точек → два самых высоких столбца схлопывались бы
// в одну высоту (pickStepByRank отдаёт последний шаг всем «лишним» рангам).
const SALES_BAR_HEIGHT_STEPS = ["h-10", "h-16", "h-20", "h-24", "h-28", "h-32", "h-36", "h-40"];
// Мобильный вариант графика продаж (горизонтальные полоски) — те же 8 шагов, до w-full.
const SALES_BAR_WIDTH_STEPS = ["w-1/3", "w-2/5", "w-1/2", "w-3/5", "w-2/3", "w-5/6", "w-11/12", "w-full"];
const TOP_PRODUCT_WIDTH_STEPS = ["w-3/5", "w-2/3", "w-5/6", "w-11/12", "w-full"];

function pickStepByRank(steps: string[], value: number, allValues: number[]): string {
  const sortedAscending = [...allValues].sort((a, b) => a - b);
  const rank = sortedAscending.indexOf(value);
  return steps[rank] ?? steps[steps.length - 1];
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-warm-cream p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
      <p className="font-venuscom text-caption text-black-olive/60">{label}</p>
      <p className="mt-2 font-venuscom text-heading-sm font-semibold text-forest-ink">{value}</p>
    </div>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="font-venuscom text-subheading uppercase tracking-[0.02em] text-forest-ink">
      {children}
    </h2>
  );
}

// Наполнение дашборда (docs/plan.md, пункт 15; about-project.md, раздел "Страница
// административной панели", пункт 1) — сводка, график, топ товаров, новые заказы,
// уведомления. Данные — Prisma-агрегаты из lib/server/dashboardStats.ts, кроме
// уведомлений о новых отзывах — они собираются здесь же из отзывов (прокинуто
// пропом из app/pekarnya-control/(protected)/page.tsx как getAdminReviews() — видит и неодобренные
// отзывы, задача 19), а не дублируются отдельным мок-массивом.
export function Dashboard({ summary, salesChart, topProducts, pendingOrders, reviews, range }: DashboardProps) {
  const revenues = salesChart.map((point) => point.revenue);
  const unitsSoldValues = topProducts.map((product) => product.unitsSold);
  const latestOrder = pendingOrders[0];
  const reviewNotifications = reviews.slice(0, 2).map((review) => ({
    id: `review-${review.id}`,
    icon: faStar,
    message: `Новый отзыв от ${review.authorName} — ${review.productName}`,
    // Времени поступления отзыва в модели нет (Review без createdAt-снапшота в
    // уведомлении) — строку "N мин назад" для отзывов не показываем.
    timeAgo: null as string | null,
  }));
  const notifications = latestOrder
    ? [
        {
          id: `order-${latestOrder.id}`,
          icon: faBagShopping,
          message: `Новый заказ №${latestOrder.id} — ${formatPrice(latestOrder.totalAmount)}`,
          timeAgo: formatTimeAgo(latestOrder.createdAt),
        },
        ...reviewNotifications,
      ]
    : reviewNotifications;

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">
        Дашборд
      </h1>

      <section className="flex flex-col gap-4">
        <SectionHeading>Сегодня</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Заказы" value={String(summary.ordersToday)} />
          <StatTile label="Выручка" value={formatPrice(summary.revenueToday)} />
          <StatTile label="Средний чек" value={formatPrice(summary.avgCheckToday)} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>За неделю</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Заказы" value={String(summary.ordersWeek)} />
          <StatTile label="Выручка" value={formatPrice(summary.revenueWeek)} />
          <StatTile label="Средний чек" value={formatPrice(summary.avgCheckWeek)} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading>График продаж</SectionHeading>
          <SalesRangeTabs active={range} />
        </div>
        <div className="bg-warm-cream p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          {/* Десктоп/планшет — вертикальные столбцы. Высота ряда раньше была
              зафиксирована (h-36) вровень с самым высоким столбиком, но подпись
              суммы над ним в эту высоту не входила и вылезала за верх карточки —
              теперь ряд просто растёт по контенту (без фиксированной высоты). */}
          <div className="hidden sm:flex sm:items-end sm:gap-6">
            {salesChart.map((point) => (
              <div key={point.fullDate} className="flex flex-1 flex-col items-center gap-2">
                <span className="font-venuscom text-caption text-black-olive/70">
                  {formatPrice(point.revenue)}
                </span>
                <div
                  title={`${point.fullDate}: ${formatPrice(point.revenue)}`}
                  tabIndex={0}
                  className={`w-full max-w-6 rounded-t-[4px] bg-forest-ink transition-colors hover:bg-forest-ink/80 ${pickStepByRank(SALES_BAR_HEIGHT_STEPS, point.revenue, revenues)}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 hidden gap-6 border-t border-sage-mist pt-2 sm:flex">
            {salesChart.map((point) => (
              <span
                key={point.fullDate}
                className="flex-1 text-center font-venuscom text-caption text-black-olive/60"
              >
                {point.dayLabel}
              </span>
            ))}
          </div>

          {/* Мобильные — 7 узких столбцов в ряд не помещались на экран (подписи сумм
              вроде "38 900 ₽" шире самих столбиков). Вместо этого — горизонтальные
              полоски (день слева, сумма справа), тот же приём, что у "Топ товаров". */}
          <div className="flex flex-col gap-4 sm:hidden">
            {salesChart.map((point) => (
              <div key={point.fullDate} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-venuscom text-body-sm text-black-olive">{point.dayLabel}</span>
                  <span className="shrink-0 font-venuscom text-caption text-black-olive/60">
                    {formatPrice(point.revenue)}
                  </span>
                </div>
                <div className="h-2 w-full bg-sage-mist/30">
                  <div
                    title={`${point.fullDate}: ${formatPrice(point.revenue)}`}
                    tabIndex={0}
                    className={`h-full rounded-r-[4px] bg-forest-ink transition-colors hover:bg-forest-ink/80 ${pickStepByRank(SALES_BAR_WIDTH_STEPS, point.revenue, revenues)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>Топ товаров</SectionHeading>
        <div className="flex max-w-2xl flex-col gap-4 bg-warm-cream p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          {topProducts.map((product) => (
            <div key={product.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-venuscom text-body-sm text-black-olive">{product.name}</span>
                <span className="shrink-0 font-venuscom text-caption text-black-olive/60">
                  {product.unitsSold} шт
                </span>
              </div>
              <div className="h-2 w-full bg-sage-mist/30">
                <div
                  title={`${product.name}: ${product.unitsSold} шт`}
                  tabIndex={0}
                  className={`h-full rounded-r-[4px] bg-forest-ink transition-colors hover:bg-forest-ink/80 ${pickStepByRank(TOP_PRODUCT_WIDTH_STEPS, product.unitsSold, unitsSoldValues)}`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>Новые заказы, требующие обработки</SectionHeading>
        <div className="overflow-x-auto bg-warm-cream shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-sage-mist">
                {["№", "Клиент", "Состав", "Сумма", "Статус", "Когда"].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-[15px] py-3 font-venuscom text-caption uppercase text-black-olive/60"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingOrders.map((order) => (
                <tr key={order.id} className="border-b border-sage-mist last:border-0">
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    <Link href={`/pekarnya-control/orders/${order.id}`} className="hover:underline">
                      №{order.id}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    {order.customerName}
                  </td>
                  <td className="px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    {order.itemsSummary}
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm font-semibold text-black-olive">
                    {formatPrice(order.totalAmount)}
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3">
                    <span className="rounded-sm bg-sage-mist/30 px-2 py-1 font-venuscom text-caption uppercase text-forest-ink">
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-caption text-black-olive/60">
                    {formatTimeAgo(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>Уведомления</SectionHeading>
        <ul className="flex max-w-2xl flex-col gap-3 bg-warm-cream p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          {notifications.map((notification) => (
            <li key={notification.id} className="flex items-start gap-3">
              <FontAwesomeIcon icon={notification.icon} className="mt-1 size-3.5 text-forest-ink" />
              <div>
                <p className="font-venuscom text-body-sm text-black-olive">{notification.message}</p>
                {notification.timeAgo ? (
                  <p className="font-venuscom text-caption text-black-olive/60">
                    {notification.timeAgo}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
