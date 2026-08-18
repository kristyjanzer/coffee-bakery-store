import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import {
  getCustomerOrderHistory,
  getOrderById,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orders";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";

export const metadata: Metadata = {
  title: "Заказ — Coffee Bakery",
};

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

// Карточка заказа (docs/plan.md, пункт 16; about-project.md, раздел "Заказы"): состав,
// сумма, способ оплаты, статус оплаты, комментарий клиента, смена статуса, история
// заказов клиента.
export default async function AdminOrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  const orderId = Number(id);
  const order = Number.isNaN(orderId) ? undefined : await getOrderById(orderId);

  if (!order) {
    notFound();
  }

  const customerHistory = await getCustomerOrderHistory(order.customerContact, order.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/pekarnya-control/orders"
          className="font-venuscom text-caption text-black-olive/60 hover:text-black-olive hover:underline"
        >
          ← Все заказы
        </Link>
        <h1 className="mt-2 font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">
          Заказ №{order.id}
        </h1>
        <p className="mt-1 font-venuscom text-caption text-black-olive/60">
          {order.minutesAgo} мин назад
          {order.preferredDate && ` · предзаказ на ${order.preferredDate}`}
        </p>
      </div>

      <section className="grid grid-cols-1 gap-6 bg-warm-cream p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] sm:grid-cols-2 lg:grid-cols-4">
        <OrderStatusControl orderId={order.id} initialStatus={order.status} />
        <div>
          <p className="font-venuscom text-caption text-black-olive/60">Способ оплаты</p>
          <p className="mt-1 font-venuscom text-body-sm text-black-olive">{order.paymentMethod}</p>
        </div>
        <div>
          <p className="font-venuscom text-caption text-black-olive/60">Статус оплаты</p>
          <p className="mt-1 font-venuscom text-body-sm text-black-olive">
            {PAYMENT_STATUS_LABELS[order.paymentStatus]}
          </p>
        </div>
        <div>
          <p className="font-venuscom text-caption text-black-olive/60">Клиент</p>
          <p className="mt-1 font-venuscom text-body-sm text-black-olive">{order.customerName}</p>
          <p className="font-venuscom text-caption text-black-olive/60">{order.customerContact}</p>
        </div>
      </section>

      {order.comment && (
        <section className="bg-warm-cream p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <p className="font-venuscom text-caption text-black-olive/60">Комментарий клиента</p>
          <p className="mt-1 font-venuscom text-body-sm text-black-olive">«{order.comment}»</p>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-venuscom text-subheading uppercase tracking-[0.02em] text-forest-ink">
          Состав заказа
        </h2>
        <div className="overflow-x-auto bg-warm-cream shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead>
              <tr className="border-b border-sage-mist">
                {["Товар", "Цена", "Кол-во", "Сумма"].map((heading) => (
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
              {order.items.map((item) => (
                <tr key={item.productId} className="border-b border-sage-mist last:border-0">
                  <td className="px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    {item.name}
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    {formatPrice(item.price)}
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    × {item.quantity}
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm font-semibold text-black-olive">
                    {formatPrice(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="px-[15px] py-3 font-venuscom text-body-sm font-semibold text-forest-ink">
                  Итого
                </td>
                <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm font-semibold text-black-olive">
                  {formatPrice(order.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-venuscom text-subheading uppercase tracking-[0.02em] text-forest-ink">
          История заказов клиента
        </h2>
        {customerHistory.length === 0 ? (
          <p className="font-venuscom text-body-sm text-black-olive/70">
            Других заказов у этого клиента пока нет.
          </p>
        ) : (
          <ul className="flex max-w-2xl flex-col gap-3 bg-warm-cream p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
            {customerHistory.map((historyOrder) => (
              <li key={historyOrder.id}>
                <Link
                  href={`/pekarnya-control/orders/${historyOrder.id}`}
                  className="flex items-baseline justify-between gap-3 hover:underline"
                >
                  <span className="font-venuscom text-body-sm text-black-olive">
                    №{historyOrder.id} · {ORDER_STATUS_LABELS[historyOrder.status]}
                  </span>
                  <span className="shrink-0 font-venuscom text-caption text-black-olive/60">
                    {formatPrice(historyOrder.totalAmount)} · {historyOrder.minutesAgo} мин назад
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
