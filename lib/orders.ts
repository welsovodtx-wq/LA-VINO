import 'server-only';
import { createAdminClient } from './supabase/admin';
import type { OrderItem, OrderWithItems } from './types';

export function normalizeOrder(raw: Record<string, unknown>): OrderWithItems {
  const order = raw as unknown as OrderWithItems;
  return {
    ...order,
    subtotal: Number(order.subtotal),
    delivery_fee: Number(order.delivery_fee),
    total: Number(order.total),
    order_items: ((order.order_items ?? []) as OrderItem[]).map((i) => ({
      ...i,
      price: Number(i.price),
      quantity: Number(i.quantity),
    })),
  };
}

export async function getOrderWithItems(id: string): Promise<OrderWithItems | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[orders] fetch error', error);
    return null;
  }
  if (!data) return null;
  return normalizeOrder(data as Record<string, unknown>);
}