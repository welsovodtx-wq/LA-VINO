import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getOrderWithItems } from '@/lib/orders';
import { notifyNewOrder } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({ orderId: z.string().uuid() });

async function isAuthorized(req: Request): Promise<boolean> {
  const secret = process.env.NOTIFY_SECRET;
  const header = req.headers.get('x-notify-secret');
  if (secret && header && header === secret) return true;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.app_metadata?.role === 'admin';
}

export async function POST(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  const result = await notifyNewOrder(order);
  const ok = result.email || result.telegram;

  return NextResponse.json({ ok, ...result }, { status: ok ? 200 : 502 });
}