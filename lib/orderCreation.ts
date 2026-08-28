import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { normalizePhone, type CreateOrderInput } from "@/lib/validations/order";

export type CreateOrderResult = { ok: true; orderId: number } | { ok: false; error: string };

// Создание заявки гостем (docs/plan.md, пункт 28) — не путать с lib/orders.ts
// (там теперь только submitOrder + константы статусов заказа).
// Название и цена товара в OrderItem — снимок из Prisma на момент заказа
// (docs/architecture.md, раздел 3), а не то, что прислал клиент: иначе покупатель
// мог бы подделать сумму заказа, отправив произвольную цену в запросе.
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const productIds = input.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  for (const item of input.items) {
    const product = productById.get(item.productId);
    if (!product) {
      return { ok: false, error: `Товар #${item.productId} недоступен` };
    }
    if (product.stockQuantity !== null && item.quantity > product.stockQuantity) {
      return { ok: false, error: `«${product.name}»: доступно только ${product.stockQuantity} шт.` };
    }
  }

  const orderItems = input.items.map((item) => {
    // Найден выше в цикле проверки — здесь точно есть в productById.
    const product = productById.get(item.productId)!;
    return {
      productId: product.id,
      productNameSnapshot: product.name,
      priceSnapshot: product.price,
      quantity: item.quantity,
    };
  });

  const totalAmount = orderItems.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);

  // Телефон — ключ идентификации клиента (Customer.phone @unique). Приводим к
  // единому виду, чтобы "+7 900…" и "8 900…" от одного человека не завели двух.
  const phone = normalizePhone(input.customerContact);

  // Заказ и его клиент создаются в одной транзакции: если order.create упадёт,
  // не должно остаться "висящего" Customer без единого заказа.
  let order: { id: number };
  try {
    order = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { phone },
        update: { name: input.customerName, email: input.email },
        create: { name: input.customerName, phone, email: input.email },
      });

      return tx.order.create({
        data: {
          customerName: input.customerName,
          customerContact: input.customerContact,
          customerEmail: input.email,
          comment: input.comment || null,
          preferredDate: input.preferredDate ? new Date(input.preferredDate) : null,
          totalAmount,
          customerId: customer.id,
          items: { create: orderItems },
        },
        select: { id: true },
      });
    });
  } catch (error) {
    // P2002 — коллизия по unique-полю (напр. Customer.email на Neon, пока не
    // применена миграция drop_customer_email_unique). Не роняем гостю заявку 500-й,
    // отдаём мягкий текст — повторная отправка обычно проходит. Всё остальное
    // (реальная недоступность БД и т.п.) пробрасываем → route вернёт 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Не удалось оформить заявку — попробуйте ещё раз." };
    }
    throw error;
  }

  return { ok: true, orderId: order.id };
}
