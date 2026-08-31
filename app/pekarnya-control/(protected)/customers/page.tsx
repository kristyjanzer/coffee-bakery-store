import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice, formatTimeAgo } from "@/lib/utils";
import { getCustomers } from "@/lib/server/customers";

export const metadata: Metadata = {
  title: "Клиенты — Coffee Bakery",
};

// Список клиентов (docs/plan.md, пункт 18; about-project.md, раздел "Клиенты"):
// имя, телефон, email, кол-во заказов, сумма всех заказов, дата последнего заказа.
export default async function AdminCustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">
        Клиенты
      </h1>

      {customers.length === 0 ? (
        <p className="font-venuscom text-body-sm text-black-olive/70">Клиентов пока нет.</p>
      ) : (
        <div className="overflow-x-auto bg-warm-cream shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-sage-mist">
                {["Имя", "Телефон", "Email", "Заказов", "Сумма заказов", "Последний заказ"].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-[15px] py-3 font-venuscom text-caption uppercase text-black-olive/60"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-sage-mist last:border-0">
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    <Link href={`/pekarnya-control/customers/${customer.id}`} className="hover:underline">
                      {customer.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive/70">
                    {customer.phone}
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive/70">
                    {customer.email}
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    {customer.ordersCount}
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm font-semibold text-black-olive">
                    {formatPrice(customer.totalSpent)}
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-caption text-black-olive/60">
                    {customer.lastOrderAt ? formatTimeAgo(customer.lastOrderAt) : "—"}
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
