'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { OrderItem, OrderStatus, OrderWithItems, PaymentStatus } from '@/lib/types';
import {
  DELIVERY_TYPE_LABELS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
} from '@/lib/config';
import { formatDateTime, formatPhone, formatPrice } from '@/lib/format';

const STATUS_COLORS: Record<OrderStatus, string> = {
  new: 'bg-gold-400/15 text-gold-400',
  confirmed: 'bg-sky-500/15 text-sky-300',
  cooking: 'bg-orange-500/15 text-orange-300',
  delivering: 'bg-violet-500/15 text-violet-300',
  completed: 'bg-emerald-500/15 text-emerald-300',
  canceled: 'bg-red-500/15 text-red-300',
};

const PAYMENT_COLORS: Record<PaymentStatus, string> = {
  pending: 'text-gold-400',
  paid: 'text-emerald-300',
  canceled: 'text-red-300',
  refunded: 'text-sky-300',
};

function normalize(rows: unknown[]): OrderWithItems[] {
  return (rows as OrderWithItems[]).map((o) => ({
    ...o,
    subtotal: Number(o.subtotal),
    delivery_fee: Number(o.delivery_fee),
    total: Number(o.total),
    order_items: ((o.order_items ?? []) as OrderItem[]).map((i) => ({ ...i, price: Number(i.price) })),
  }));
}

export default function OrdersTable() {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      let query = supabase.from('orders').select('*, order_items(*)');
      if (filter !== 'all') query = query.eq('status', filter);
      const { data, error: loadError } = await query.order('created_at', { ascending: false }).limit(200);
      if (loadError) {
        setError(loadError.message);
      } else {
        setError(null);
        setOrders(normalize(data ?? []));
      }
      setLoading(false);
    },
    [supabase, filter],
  );

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(true), 30000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  async function updateOrder(id: string, patch: Partial<Pick<OrderWithItems, 'status' | 'payment_status'>>) {
    setBusy(id);
    const prev = orders;
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    const { error: updateError } = await supabase.from('orders').update(patch).eq('id', id);
    if (updateError) {
      setOrders(prev);
      setError(`Не удалось обновить заказ: ${updateError.message}`);
    } else {
      setNotice('Сохранено');
      if (filter !== 'all' && patch.status && patch.status !== filter) {
        setOrders((list) => list.filter((o) => o.id !== id));
      }
    }
    setBusy(null);
  }

  async function resendNotify(id: string) {
    setBusy(id);
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotice(`Уведомления: email ${data.email ? '✓' : '✕'}, Telegram ${data.telegram ? '✓' : '✕'}`);
      } else {
        setError(data.error ?? 'Не удалось отправить уведомления');
      }
    } catch {
      setError('Ошибка сети');
    }
    setBusy(null);
  }

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const tabClass = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-4 py-1.5 text-xs transition ${
      active ? 'border-wine-500 bg-wine-600 text-cream-50' : 'border-cream-200/15 text-cream-200 hover:border-gold-400'
    }`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={tabClass(filter === 'all')} onClick={() => setFilter('all')}>
            Все
          </button>
          {ORDER_STATUSES.map((s) => (
            <button key={s} type="button" className={tabClass(filter === s)} onClick={() => setFilter(s)}>
              {ORDER_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void load()} className="btn btn-ghost btn-sm">
          Обновить
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
          {error}{' '}
          <button type="button" className="underline" onClick={() => setError(null)}>
            Скрыть
          </button>
        </p>
      )}
      {notice && <p className="mb-4 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}

      {loading ? (
        <p className="text-cream-300">Загрузка заказов…</p>
      ) : orders.length === 0 ? (
        <p className="card p-8 text-center text-cream-300">Заказов нет</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isOpen = expanded.has(order.id);
            return (
              <div key={order.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-serif text-2xl text-cream-50">№{order.number}</span>
                      <span className={`rounded-full px-3 py-1 text-xs ${STATUS_COLORS[order.status]}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-cream-300">{formatDateTime(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-2xl text-gold-400">{formatPrice(order.total)}</p>
                    <p className={`text-xs ${PAYMENT_COLORS[order.payment_status]}`}>
                      {PAYMENT_METHOD_LABELS[order.payment_method]} · {PAYMENT_STATUS_LABELS[order.payment_status]}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="label">Клиент</p>
                    <p className="text-cream-50">{order.customer_name}</p>
                    <a href={`tel:+${order.phone}`} className="text-cream-200 hover:text-gold-400">
                      {formatPhone(order.phone)}
                    </a>
                  </div>
                  <div>
                    <p className="label">{DELIVERY_TYPE_LABELS[order.delivery_type]}</p>
                    <p className="text-cream-200">{order.delivery_type === 'delivery' ? order.address : '—'}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
                    <select
                      aria-label="Статус заказа"
                      className="input py-2 text-sm"
                      value={order.status}
                      disabled={busy === order.id}
                      onChange={(e) => void updateOrder(order.id, { status: e.target.value as OrderStatus })}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {ORDER_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Статус оплаты"
                      className="input py-2 text-sm"
                      value={order.payment_status}
                      disabled={busy === order.id}
                      onChange={(e) =>
                        void updateOrder(order.id, { payment_status: e.target.value as PaymentStatus })
                      }
                    >
                      {PAYMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {PAYMENT_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => toggle(order.id)} className="btn btn-ghost btn-sm">
                    {isOpen ? 'Скрыть состав' : `Состав (${order.order_items.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => void resendNotify(order.id)}
                    disabled={busy === order.id}
                    className="btn btn-ghost btn-sm"
                  >
                    Повторить уведомление
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-4 rounded-xl bg-ink-800/60 p-4 text-sm">
                    <ul className="divide-y divide-cream-200/10">
                      {order.order_items.map((item) => (
                        <li key={item.id} className="flex justify-between py-2">
                          <span className="text-cream-100">
                            {item.dish_name}
                            {item.weight ? (
                              <span className="text-cream-300/70">
                                {' '}
                                · {item.weight} {item.unit}
                              </span>
                            ) : null}{' '}
                            <span className="text-cream-300">× {item.quantity}</span>
                          </span>
                          <span className="text-cream-50">{formatPrice(item.price * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 space-y-1 border-t border-cream-200/10 pt-3 text-cream-300">
                      <div className="flex justify-between">
                        <span>Подытог</span>
                        <span>{formatPrice(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Доставка</span>
                        <span>{formatPrice(order.delivery_fee)}</span>
                      </div>
                    </div>
                    {order.comment && (
                      <p className="mt-3 rounded-lg bg-wine-900/40 p-3 text-cream-200">💬 {order.comment}</p>
                    )}
                    {order.payment_id && (
                      <p className="mt-3 text-xs text-cream-300/60">Платёж ЮKassa: {order.payment_id}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}