import { prisma } from "@/lib/prisma";
import type { CreateOrderInput } from "@/lib/validations/order";

export type CreateOrderResult = { ok: true; orderId: number } | { ok: false; error: string };

// Создание заявки гостем (docs/plan.md, пункт 28) — не путать с lib/orders.ts
// (мок-данные раздела админки "Заказы", пункт 16, ещё не переведён на Prisma).
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

  const order = await prisma.order.create({
    data: {
      customerName: input.customerName,
      customerContact: input.customerContact,
      customerEmail: input.email,
      comment: input.comment || null,
      preferredDate: input.preferredDate ? new Date(input.preferredDate) : null,
      totalAmount,
      items: { create: orderItems },
    },
    select: { id: true },
  });

  return { ok: true, orderId: order.id };
}
