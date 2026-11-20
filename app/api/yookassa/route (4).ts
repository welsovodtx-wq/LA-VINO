import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPayment, type YooPayment } from '@/lib/yookassa';
import { escapeHtml, sendTelegram } from '@/lib/notify';
import { formatPrice } from '@/lib/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type YooNotification = {
  type?: string;
  event?: string;
  object?: { id?: string; payment_id?: string };
};

export async function POST(req: Request) {
  let body: YooNotification;
  try {
    body = (await req.json()) as YooNotification;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = body.event;
  const isRefund = typeof event === 'string' && event.startsWith('refund.');
  const paymentId = isRefund ? body.object?.payment_id : body.object?.id;

  if (!event || !paymentId) {
    return NextResponse.json({ error: 'Invalid notification' }, { status: 400 });
  }

  // Подлинность проверяется повторным запросом платежа напрямую в API ЮKassa
  let payment: YooPayment;
  try {
    payment = await getPayment(paymentId);
  } catch (e) {
    console.error('[webhook] getPayment error', e);
    return NextResponse.json({ error: 'Payment check failed' }, { status: 500 });
  }

  const orderId = payment.metadata?.order_id;
  if (!orderId) return NextResponse.json({ ok: true, ignored: 'no order_id' });

  const supabase = createAdminClient();
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, number, total, payment_id, payment_status')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    console.error('[webhook] order fetch error', orderError);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  if (!order) return NextResponse.json({ ok: true, ignored: 'order not found' });

  if (event === 'refund.succeeded') {
    if (Number(payment.refunded_amount?.value ?? 0) > 0) {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'refunded' })
        .eq('id', orderId);
      if (error) {
        console.error('[webhook] refund update error', error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
      }
      try {
        await sendTelegram(`↩️ <b>Возврат по заказу №${order.number}</b>\nСумма возврата: ${escapeHtml(formatPrice(Number(payment.refunded_amount?.value ?? 0)))}`);
      } catch (e) {
        console.error('[webhook] telegram refund notify failed', e);
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (payment.status === 'succeeded') {
    if (Math.abs(Number(payment.amount.value) - Number(order.total)) > 0.009) {
      console.error(`[webhook] amount mismatch for order ${order.number}: paid ${payment.amount.value}, expected ${order.total}`);
      return NextResponse.json({ ok: true, ignored: 'amount mismatch' });
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update({ payment_status: 'paid', payment_id: payment.id })
      .eq('id', orderId)
      .neq('payment_status', 'paid')
      .select('id');

    if (error) {
      console.error('[webhook] paid update error', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    if (updated && updated.length > 0) {
      try {
        await sendTelegram(
          `✅ <b>Заказ №${order.number} оплачен</b>\nСумма: ${escapeHtml(formatPrice(Number(payment.amount.value)))}\nПлатёж: <code>${escapeHtml(payment.id)}</code>`,
        );
      } catch (e) {
        console.error('[webhook] telegram paid notify failed', e);
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (payment.status === 'canceled') {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: 'canceled' })
      .eq('id', orderId)
      .eq('payment_id', payment.id)
      .eq('payment_status', 'pending');

    if (error) {
      console.error('[webhook] canceled update error', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: payment.status });
}