import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { getCustomerById } from "@/lib/customers";
import { getOrders, ORDER_STATUS_LABELS } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Клиент — Кофейня-пекарня",
};

interface CustomerPageProps {
  params: Promise<{ id: string }>;
}

// Карточка клиента (docs/plan.md, пункт 18): имя, телефон, email, адрес доставки,
// история покупок (about-project.md, раздел "Клиенты").
export default async function AdminCustomerPage({ params }: CustomerPageProps) {
  const { id } = await params;
  const customerId = Number(id);
  const customer = Number.isNaN(customerId) ? undefined : await getCustomerById(customerId);

  if (!customer) {
    notFound();
  }

  const orders = (await getOrders()).filter((order) => order.customerContact === customer.phone);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/customers"
          className="font-venuscom text-caption text-black-olive/60 hover:text-black-olive hover:underline"
        >
          ← Все клиенты
        </Link>
        <h1 className="mt-2 font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">
          {customer.name}
        </h1>
      </div>

      <section className="grid grid-cols-1 gap-6 bg-warm-cream p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-venuscom text-caption text-black-olive/60">Телефон</p>
          <p className="mt-1 font-venuscom text-body-sm text-black-olive">{customer.phone}</p>
        </div>
        <div>
          <p className="font-venuscom text-caption text-black-olive/60">Email</p>
          <p className="mt-1 font-venuscom text-body-sm text-black-olive">{customer.email}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="font-venuscom text-caption text-black-olive/60">Адрес доставки</p>
          <p className="mt-1 font-venuscom text-body-sm text-black-olive">{customer.deliveryAddress}</p>
        </div>
        <div>
          <p className="font-venuscom text-caption text-black-olive/60">Заказов</p>
          <p className="mt-1 font-venuscom text-body-sm text-black-olive">{customer.ordersCount}</p>
        </div>
        <div>
          <p className="font-venuscom text-caption text-black-olive/60">Сумма всех заказов</p>
          <p className="mt-1 font-venuscom text-body-sm font-semibold text-black-olive">
            {formatPrice(customer.totalSpent)}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-venuscom text-subheading uppercase tracking-[0.02em] text-forest-ink">
          История заказов
        </h2>
        <div className="overflow-x-auto bg-warm-cream shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-sage-mist">
                {["№", "Состав", "Сумма", "Статус", "Когда"].map((heading) => (
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
      </section>
    </div>
  );
}
