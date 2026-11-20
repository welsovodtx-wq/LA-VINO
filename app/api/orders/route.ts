import { NextResponse } from 'next/server';
import { orderSchema, normalizePhone } from '@/lib/validation';
import { createAdminClient } from '@/lib/supabase/admin';
import { calcDeliveryFee, MAX_ITEM_QUANTITY } from '@/lib/config';
import { notifyNewOrder } from '@/lib/notify';
import { normalizeOrder } from '@/lib/orders';
import type { Dish } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Проверьте правильность заполнения полей', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const quantities = new Map<string, number>();
  for (const item of input.items) {
    quantities.set(item.dishId, (quantities.get(item.dishId) ?? 0) + item.quantity);
  }
  for (const q of quantities.values()) {
    if (q > MAX_ITEM_QUANTITY) {
      return NextResponse.json({ error: `Максимум ${MAX_ITEM_QUANTITY} шт. одной позиции` }, { status: 400 });
    }
  }
  const ids = Array.from(quantities.keys());

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    console.error('[orders] supabase config', e);
    return NextResponse.json({ error: 'Сервис временно недоступен' }, { status: 503 });
  }

  const { data: dishRows, error: dishError } = await supabase.from('dishes').select('*').in('id', ids);
  if (dishError) {
    console.error('[orders] dishes fetch error', dishError);
    return NextResponse.json({ error: 'Не удалось проверить меню. Попробуйте позже.' }, { status: 500 });
  }

  const available = new Map<string, Dish>(
    ((dishRows ?? []) as Dish[]).filter((d) => d.is_available).map((d) => [d.id, d]),
  );
  const unavailable = ids.filter((id) => !available.has(id));
  if (unavailable.length > 0) {
    return NextResponse.json(
      { error: 'Некоторые блюда больше недоступны и были удалены из корзины. Проверьте заказ.', unavailable },
      { status: 409 },
    );
  }

  const lines = ids.map((id) => {
    const dish = available.get(id)!;
    return {
      dish_id: dish.id,
      dish_name: dish.name,
      price: round2(Number(dish.price)),
      quantity: quantities.get(id)!,
      weight: dish.weight,
      unit: dish.unit,
    };
  });

  const subtotal = round2(lines.reduce((sum, l) => sum + l.price * l.quantity, 0));
  const deliveryFee = calcDeliveryFee(subtotal, input.deliveryType);
  const total = round2(subtotal + deliveryFee);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_name: input.name,
      phone: normalizePhone(input.phone),
      delivery_type: input.deliveryType,
      address: input.deliveryType === 'delivery' ? input.address : null,
      comment: input.comment || null,
      payment_method: input.paymentMethod,
      subtotal,
      delivery_fee: deliveryFee,
      total,
    })
    .select('*')
    .single();

  if (orderError || !order) {
    console.error('[orders] insert error', orderError);
    return NextResponse.json({ error: 'Не удалось сохранить заказ. Попробуйте ещё раз.' }, { status: 500 });
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from('order_items')
    .insert(lines.map((l) => ({ ...l, order_id: order.id })))
    .select('*');

  if (itemsError) {
    console.error('[orders] items insert error', itemsError);
    await supabase.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: 'Не удалось сохранить заказ. Попробуйте ещё раз.' }, { status: 500 });
  }

  const fullOrder = normalizeOrder({ ...order, order_items: itemRows ?? [] });

  // Уведомления не влияют на сохранение заказа
  try {
    await notifyNewOrder(fullOrder);
  } catch (e) {
    console.error('[orders] notify unexpected error', e);
  }

  return NextResponse.json(
    { orderId: fullOrder.id, number: fullOrder.number, total: fullOrder.total },
    { status: 201 },
  );
}