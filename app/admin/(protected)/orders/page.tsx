import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { getOrders, ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Заказы — Coffee Bakery",
};

interface OrdersPageProps {
  searchParams: Promise<{ status?: string }>;
}

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(value);
}

// Список заказов с фильтром по статусу (docs/plan.md, пункт 16; about-project.md,
// раздел "Заказы"). Фильтр — обычные ссылки с query-параметром (?status=NEW), без
// клиентского JS: Server Component сам перечитывает список под нужный статус.
export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const { status: rawStatus } = await searchParams;
  const activeStatus = rawStatus && isOrderStatus(rawStatus) ? rawStatus : undefined;
  const orders = await getOrders(activeStatus);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">
        Заказы
      </h1>

      <div className="flex flex-wrap gap-3" role="tablist">
        <Link
          href="/admin/orders"
          role="tab"
          aria-selected={!activeStatus}
          className={
            !activeStatus
              ? "rounded-sm border border-black-olive px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive"
              : "rounded-sm px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive/60 hover:text-black-olive"
          }
        >
          Все
        </Link>
        {ORDER_STATUSES.map((status) => (
          <Link
            key={status}
            href={`/admin/orders?status=${status}`}
            role="tab"
            aria-selected={activeStatus === status}
            className={
              activeStatus === status
                ? "rounded-sm border border-black-olive px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive"
                : "rounded-sm px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive/60 hover:text-black-olive"
            }
          >
            {ORDER_STATUS_LABELS[status]}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="font-venuscom text-body-sm text-black-olive/70">
          Заказов с таким статусом пока нет.
        </p>
      ) : (
        <div className="overflow-x-auto bg-warm-cream shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-sage-mist">
                {["№", "Клиент", "Контакт", "Состав", "Сумма", "Статус", "Когда"].map((heading) => (
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
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-sage-mist last:border-0">
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                      №{order.id}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    {order.customerName}
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive/70">
                    {order.customerContact}
                  </td>
                  <td className="px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    {order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}
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
                    {order.minutesAgo} мин назад
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
