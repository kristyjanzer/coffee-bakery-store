import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

// Уведомление о новой заявке в Telegram (docs/plan.md, пункт 33; docs/architecture.md,
// раздел 6). Строго best-effort: любая проблема (нет токена, сеть, не-2xx от Telegram)
// только логируется и не пробрасывается — создание заказа она ронять не должна. Вызов
// из POST /api/orders дополнительно обёрнут в try/catch как второй рубеж.
//
// Секреты берутся только из process.env на сервере, без префикса NEXT_PUBLIC_.
const TELEGRAM_API = "https://api.telegram.org";

// Ответ Telegram успел бы задержать подтверждение заказа покупателю — ограничиваем
// ожидание. Сам заказ к этому моменту уже в БД, так что таймаут ничем не грозит.
const TELEGRAM_TIMEOUT_MS = 4000;

interface NotifiableOrderItem {
  productNameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
}

interface NotifiableOrder {
  id: number;
  customerName: string;
  customerContact: string;
  customerEmail: string;
  comment: string | null;
  preferredDate: Date | null;
  totalAmount: number;
  items: NotifiableOrderItem[];
}

// Обычный текст без parse_mode — тогда имя/комментарий клиента не нужно экранировать
// и нельзя сломать разметку сообщения через пользовательский ввод.
function formatOrderMessage(order: NotifiableOrder): string {
  const lines = [
    `🥐 Новая заявка №${order.id}`,
    "",
    `Клиент: ${order.customerName}`,
    `Телефон: ${order.customerContact}`,
    `Email: ${order.customerEmail}`,
  ];

  if (order.preferredDate) {
    lines.push(`Дата предзаказа: ${order.preferredDate.toLocaleDateString("ru-RU")}`);
  }
  if (order.comment) {
    lines.push(`Комментарий: ${order.comment}`);
  }

  lines.push("", "Состав:");
  for (const item of order.items) {
    lines.push(
      `• ${item.productNameSnapshot} × ${item.quantity} — ${formatPrice(item.priceSnapshot * item.quantity)}`
    );
  }
  lines.push("", `Итого: ${formatPrice(order.totalAmount)}`);

  return lines.join("\n");
}

export async function notifyNewOrder(orderId: number): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("notifyNewOrder: TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID не заданы — пропускаю");
    return;
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerName: true,
        customerContact: true,
        customerEmail: true,
        comment: true,
        preferredDate: true,
        totalAmount: true,
        items: {
          select: { productNameSnapshot: true, priceSnapshot: true, quantity: true },
        },
      },
    });

    if (!order) {
      console.warn(`notifyNewOrder: заказ №${orderId} не найден`);
      return;
    }

    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: formatOrderMessage(order),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`notifyNewOrder: Telegram ответил ${response.status} ${body}`);
      return;
    }

    // Отметка, что уведомление ушло (Order.telegramNotifiedAt) — задел под повторную
    // отправку/аудит из админки.
    await prisma.order.update({
      where: { id: orderId },
      data: { telegramNotifiedAt: new Date() },
    });
  } catch (error) {
    console.error("notifyNewOrder:", error);
  }
}
