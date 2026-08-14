import { getOrders, type OrderRecord } from "@/lib/orders";

// --- Админка: раздел "Клиенты" (docs/plan.md, пункт 18) ---
//
// Customer в Prisma — задел на будущее (docs/architecture.md, раздел 3), заказы пока
// не привязаны к нему (customerId необязателен). Поэтому, как и в Товарах/Заказах/
// Dashboard (задачи 29-31), источник — не отдельная таблица, а группировка уже
// существующих моковых заказов (lib/orders.ts) по customerContact: там уже 7 разных
// клиентов, у части — по несколько заказов (специально для "истории клиента",
// задача 30). email/deliveryAddress в Order не хранятся, а в ТЗ (about-project.md,
// раздел "Клиенты") они обязательны в карточке клиента — единственная мок-таблица
// на эти 7 контактов, по аналогии с тем, как lib/dashboard.ts (задача 29) мокал
// только недостающие метрики поверх реальных товаров.

const CUSTOMER_CONTACT_INFO: Record<string, { email: string; deliveryAddress: string }> = {
  "+7 900 123-45-01": { email: "anna.smirnova@example.com", deliveryAddress: "г. Москва, ул. Ленина, д. 12, кв. 45" },
  "+7 900 123-45-02": { email: "igor.petrov@example.com", deliveryAddress: "г. Москва, Кутузовский пр-т, д. 5, кв. 18" },
  "+7 900 123-45-03": { email: "svetlana.antonova@example.com", deliveryAddress: "г. Москва, ул. Тверская, д. 9, кв. 3" },
  "+7 900 123-45-04": { email: "dmitry.volkov@example.com", deliveryAddress: "г. Москва, Ленинский пр-т, д. 45, кв. 90" },
  "+7 900 123-45-06": { email: "olga.titova@example.com", deliveryAddress: "г. Москва, ул. Арбат, д. 20, кв. 7" },
  "+7 900 123-45-07": { email: "nikolay.romanov@example.com", deliveryAddress: "г. Москва, Профсоюзная ул., д. 63, кв. 112" },
  "+7 900 123-45-09": { email: "marina.kovaleva@example.com", deliveryAddress: "г. Москва, ул. Малая Бронная, д. 2, кв. 33" },
};

export interface CustomerRecord {
  id: number;
  name: string;
  phone: string;
  email: string;
  deliveryAddress: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderMinutesAgo: number;
}

async function buildCustomers(): Promise<CustomerRecord[]> {
  // getOrders() без фильтра уже отсортирован по minutesAgo по возрастанию (самые
  // недавние — первыми, lib/orders.ts) — группировка по Map сохраняет этот порядок,
  // поэтому список клиентов получается "недавно оформлял заказ — выше".
  const orders = await getOrders();
  const grouped = new Map<string, OrderRecord[]>();

  for (const order of orders) {
    const existing = grouped.get(order.customerContact);
    if (existing) {
      existing.push(order);
    } else {
      grouped.set(order.customerContact, [order]);
    }
  }

  let nextId = 1;
  const customers: CustomerRecord[] = [];
  for (const [phone, customerOrders] of grouped) {
    const info = CUSTOMER_CONTACT_INFO[phone];
    customers.push({
      id: nextId++,
      name: customerOrders[0].customerName,
      phone,
      email: info?.email ?? "",
      deliveryAddress: info?.deliveryAddress ?? "",
      ordersCount: customerOrders.length,
      totalSpent: customerOrders.reduce((sum, order) => sum + order.totalAmount, 0),
      lastOrderMinutesAgo: Math.min(...customerOrders.map((order) => order.minutesAgo)),
    });
  }

  return customers;
}

export async function getCustomers(): Promise<CustomerRecord[]> {
  return buildCustomers();
}

export async function getCustomerById(id: number): Promise<CustomerRecord | undefined> {
  const customers = await buildCustomers();
  return customers.find((customer) => customer.id === id);
}
