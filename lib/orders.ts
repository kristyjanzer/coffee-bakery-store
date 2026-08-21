import type { OrderFormValues } from "@/lib/validations/order";
import type { CartItem } from "@/stores/cartStore";

export interface SubmitOrderPayload {
  form: OrderFormValues;
  items: CartItem[];
  totalPrice: number;
}

// Заглушка: POST /api/orders (докс/plan.md, пункт 28) ещё не существует —
// backend/Prisma/Telegram появятся только в пунктах 22-36. Здесь только имитация
// сети, чтобы форма (пункт 12) была протестирована целиком. Сигнатура (payload → успех)
// рассчитана на "тихую" замену на fetch("/api/orders") без переделки CheckoutForm/CartWidget,
// как lib/menu.ts/lib/reviews.ts для каталога/отзывов.
export function submitOrder(payload: SubmitOrderPayload): Promise<{ success: true }> {
  void payload;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 600);
  });
}

// --- Админка: раздел "Заказы" (docs/plan.md, пункт 16) ---
//
// Тот же принцип заглушки, что и submitOrder() выше: Order/OrderItem появятся в Prisma
// только в пунктах 22-28, поэтому здесь — единственный источник мок-заказов на всё
// приложение (lib/dashboard.ts берёт "новые заказы" для дашборда отсюда же, не дублирует
// свой список — иначе id/статусы в дашборде и в разделе "Заказы" могли бы разойтись).
// Сигнатуры уже async — тихая замена на Prisma-запросы без переделки страниц/компонентов.

export type OrderStatus = "NEW" | "IN_PROGRESS" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";

// Порядок и формулировки — 1-в-1 из about-project.md ("новый / в работе / готовится /
// готов / доставлен / отменён").
export const ORDER_STATUSES: OrderStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "PREPARING",
  "READY",
  "DELIVERED",
  "CANCELLED",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Новый",
  IN_PROGRESS: "В работе",
  PREPARING: "Готовится",
  READY: "Готов",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
};

export type PaymentStatus = "PAID" | "UNPAID";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PAID: "Оплачен",
  UNPAID: "Не оплачен",
};

export interface OrderItemRecord {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderRecord {
  id: number;
  status: OrderStatus;
  customerName: string;
  customerContact: string;
  comment: string;
  preferredDate: string | null;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  items: OrderItemRecord[];
  totalAmount: number;
  minutesAgo: number;
}

type MockOrderInput = Omit<OrderRecord, "totalAmount">;

// Реальные товары/цены из menu.json (id сверены отдельно), клиенты фейковые. Несколько
// заказов намеренно делят один и тот же customerContact — "история клиента" (пункт 16)
// иначе не на чем проверить: Анна Смирнова (#1042/#1038), Игорь Петров (#1041/#1035),
// Светлана Антонова (#1040/#1033).
const MOCK_ORDERS_INPUT: MockOrderInput[] = [
  {
    id: 1042,
    status: "NEW",
    customerName: "Анна Смирнова",
    customerContact: "+7 900 123-45-01",
    comment: "Без сахара",
    preferredDate: null,
    paymentMethod: "Наличными при получении",
    paymentStatus: "UNPAID",
    items: [
      { productId: 6, name: "Капучино", price: 270, quantity: 2 },
      { productId: 46, name: "Круассан с шоколадом", price: 260, quantity: 1 },
    ],
    minutesAgo: 5,
  },
  {
    id: 1041,
    status: "NEW",
    customerName: "Игорь Петров",
    customerContact: "+7 900 123-45-02",
    comment: "",
    preferredDate: null,
    paymentMethod: "Картой при получении",
    paymentStatus: "UNPAID",
    items: [
      { productId: 1, name: "Двойной эспрессо", price: 200, quantity: 1 },
      { productId: 39, name: "Штрудель яблочный", price: 200, quantity: 1 },
    ],
    minutesAgo: 18,
  },
  {
    id: 1040,
    status: "IN_PROGRESS",
    customerName: "Светлана Антонова",
    customerContact: "+7 900 123-45-03",
    comment: "К 18:00",
    preferredDate: null,
    paymentMethod: "Картой при получении",
    paymentStatus: "PAID",
    items: [{ productId: 64, name: 'Десерт "Соленая карамель"', price: 250, quantity: 1 }],
    minutesAgo: 32,
  },
  {
    id: 1039,
    status: "NEW",
    customerName: "Дмитрий Волков",
    customerContact: "+7 900 123-45-04",
    comment: "",
    preferredDate: null,
    paymentMethod: "Наличными при получении",
    paymentStatus: "UNPAID",
    items: [{ productId: 6, name: "Капучино", price: 270, quantity: 3 }],
    minutesAgo: 47,
  },
  {
    id: 1038,
    status: "PREPARING",
    customerName: "Анна Смирнова",
    customerContact: "+7 900 123-45-01",
    comment: "Без орехов",
    preferredDate: null,
    paymentMethod: "Картой при получении",
    paymentStatus: "PAID",
    items: [
      { productId: 8, name: "Латте", price: 270, quantity: 1 },
      { productId: 32, name: 'Печенье "Бискотти"', price: 220, quantity: 2 },
    ],
    minutesAgo: 130,
  },
  {
    id: 1037,
    status: "READY",
    customerName: "Ольга Титова",
    customerContact: "+7 900 123-45-06",
    comment: "",
    preferredDate: null,
    paymentMethod: "Наличными при получении",
    paymentStatus: "UNPAID",
    items: [{ productId: 39, name: "Штрудель яблочный", price: 200, quantity: 2 }],
    minutesAgo: 200,
  },
  {
    id: 1036,
    status: "DELIVERED",
    customerName: "Николай Романов",
    customerContact: "+7 900 123-45-07",
    comment: "",
    preferredDate: null,
    paymentMethod: "Картой при получении",
    paymentStatus: "PAID",
    items: [{ productId: 70, name: 'Торт "Медовик"', price: 1300, quantity: 1 }],
    minutesAgo: 500,
  },
  {
    id: 1035,
    status: "CANCELLED",
    customerName: "Игорь Петров",
    customerContact: "+7 900 123-45-02",
    comment: "Передумал",
    preferredDate: null,
    paymentMethod: "Картой при получении",
    paymentStatus: "UNPAID",
    items: [{ productId: 9, name: "Раф", price: 300, quantity: 1 }],
    minutesAgo: 600,
  },
  {
    id: 1034,
    status: "DELIVERED",
    customerName: "Марина Ковалёва",
    customerContact: "+7 900 123-45-09",
    comment: "",
    preferredDate: null,
    paymentMethod: "Наличными при получении",
    paymentStatus: "PAID",
    items: [
      { productId: 6, name: "Капучино", price: 270, quantity: 1 },
      { productId: 39, name: "Штрудель яблочный", price: 200, quantity: 1 },
    ],
    minutesAgo: 1300,
  },
  {
    id: 1033,
    status: "DELIVERED",
    customerName: "Светлана Антонова",
    customerContact: "+7 900 123-45-03",
    comment: "Ко дню рождения",
    preferredDate: "2026-08-20",
    paymentMethod: "Картой при получении",
    paymentStatus: "PAID",
    items: [{ productId: 64, name: 'Десерт "Соленая карамель"', price: 250, quantity: 2 }],
    minutesAgo: 2000,
  },
];

const MOCK_ORDERS: OrderRecord[] = MOCK_ORDERS_INPUT.map((order) => ({
  ...order,
  totalAmount: order.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
}));

export async function getOrders(status?: OrderStatus): Promise<OrderRecord[]> {
  const sorted = [...MOCK_ORDERS].sort((a, b) => a.minutesAgo - b.minutesAgo);
  return status ? sorted.filter((order) => order.status === status) : sorted;
}

export async function getOrderById(id: number): Promise<OrderRecord | undefined> {
  return MOCK_ORDERS.find((order) => order.id === id);
}

// Другие заказы того же клиента (по customerContact — Customer как отдельная модель
// появится только "на вырост", docs/architecture.md, раздел 7), без текущего заказа.
export async function getCustomerOrderHistory(
  customerContact: string,
  excludeOrderId: number
): Promise<OrderRecord[]> {
  return MOCK_ORDERS.filter(
    (order) => order.customerContact === customerContact && order.id !== excludeOrderId
  ).sort((a, b) => a.minutesAgo - b.minutesAgo);
}

// Заглушка: PATCH /api/orders/[id] (пункт 29 плана) ещё не существует. Не мутирует
// MOCK_ORDERS (нет реального хранилища) — компонент, который зовёт эту функцию, сам
// держит новый статус в локальном состоянии после успешного вызова.
export function updateOrderStatus(id: number, status: OrderStatus): Promise<{ success: true }> {
  void id;
  void status;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 500);
  });
}
