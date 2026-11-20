import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrderWithItems } from '@/lib/orders';
import { createPayment, getPayment } from '@/lib/yookassa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({ orderId: z.string().uuid() });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректный номер заказа' }, { status: 400 });
  }

  const order = await getOrderWithItems(parsed.data.orderId);
  if (!order) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
  if (order.payment_method !== 'online') {
    return NextResponse.json({ error: 'Для заказа выбрана оплата при получении' }, { status: 400 });
  }
  if (order.payment_status === 'paid') {
    return NextResponse.json({ error: 'Заказ уже оплачен' }, { status: 409 });
  }
  if (order.status === 'canceled') {
    return NextResponse.json({ error: 'Заказ отменён' }, { status: 409 });
  }
  if (order.order_items.length === 0) {
    return NextResponse.json({ error: 'Заказ пуст' }, { status: 400 });
  }

  try {
    if (order.payment_id) {
      const existing = await getPayment(order.payment_id);
      if (existing.status === 'pending' && existing.confirmation?.confirmation_url) {
        return NextResponse.json({ confirmationUrl: existing.confirmation.confirmation_url, paymentId: existing.id });
      }
      if (existing.status === 'succeeded') {
        return NextResponse.json({ error: 'Заказ уже оплачен' }, { status: 409 });
      }
    }

    const payment = await createPayment(order);
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('orders')
      .update({ payment_id: payment.id, payment_status: 'pending' })
      .eq('id', order.id);

    if (error) console.error('[yookassa] save payment_id error', error);

    const url = payment.confirmation?.confirmation_url;
    if (!url) {
      return NextResponse.json({ error: 'ЮKassa не вернула ссылку на оплату' }, { status: 502 });
    }

    return NextResponse.json({ confirmationUrl: url, paymentId: payment.id });
  } catch (e) {
    console.error('[yookassa] create payment error', e);
    return NextResponse.json({ error: 'Не удалось создать платёж. Попробуйте позже.' }, { status: 502 });
  }
}