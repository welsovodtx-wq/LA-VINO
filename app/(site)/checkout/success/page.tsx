import type { Metadata } from 'next';
import Link from 'next/link';
import PayButton from '@/components/PayButton';
import { getOrderWithItems } from '@/lib/orders';
import { DELIVERY_TYPE_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, ORDER_STATUS_LABELS } from '@/lib/config';
import { formatPrice } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Заказ оформлен',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { order?: string; payment_error?: string };
}) {
  const orderId = searchParams.order;
  const order = orderId && UUID_RE.test(orderId) ? await getOrderWithItems(orderId) : null;

  if (!order) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="section-title">Заказ не найден</h1>
        <Link href="/menu" className="btn btn-primary mt-10">
          Вернуться в меню
        </Link>
      </div>
    );
  }

  const awaitingPayment =
    order.payment_method === 'online' && order.payment_status !== 'paid' && order.status !== 'canceled';

  return (
    <div className="container-x py-16">
      <div className="card mx-auto max-w-2xl p-8 sm:p-12">
        <p className="eyebrow text-center">Спасибо за заказ</p>
        <h1 className="mt-4 text-center font-serif text-5xl text-cream-50">№{order.number}</h1>

        {order.payment_method === 'online' && order.payment_status === 'paid' && (
          <p className="mt-6 rounded-xl bg-emerald-500/10 p-4 text-center text-emerald-300">
            Оплата прошла успешно. Мы уже готовим ваш заказ.
          </p>
        )}

        {awaitingPayment && (
          <div className="mt-6 rounded-xl bg-wine-900/50 p-5 text-center">
            <p className="text-cream-200">
              {searchParams.payment_error
                ? 'Не удалось перейти к оплате. Попробуйте ещё раз.'
                : 'Заказ ожидает оплаты. Если вы уже оплатили — статус обновится в течение минуты.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <PayButton orderId={order.id} />
              <Link href={`/checkout/success?order=${order.id}`} className="btn btn-ghost">
                Обновить статус
              </Link>
            </div>
          </div>
        )}

        {order.payment_method === 'cash' && (
          <p className="mt-6 text-center text-cream-300">
            Мы свяжемся с вами для подтверждения. Оплата при получении.
          </p>
        )}

        <dl className="mt-10 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="label">Статус</dt>
            <dd className="text-cream-50">{ORDER_STATUS_LABELS[order.status]}</dd>
          </div>
          <div>
            <dt className="label">Оплата</dt>
            <dd className="text-cream-50">
              {PAYMENT_METHOD_LABELS[order.payment_method]} · {PAYMENT_STATUS_LABELS[order.payment_status]}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="label">Получение</dt>
            <dd className="text-cream-50">
              {DELIVERY_TYPE_LABELS[order.delivery_type]}
              {order.delivery_type === 'delivery' && order.address ? `: ${order.address}` : ''}
            </dd>
          </div>
        </dl>

        <ul className="mt-8 divide-y divide-cream-200/10 border-y border-cream-200/10">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-3 text-sm">
              <span className="text-cream-100">
                {item.dish_name} <span className="text-cream-300">× {item.quantity}</span>
              </span>
              <span className="text-cream-50">{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between text-cream-300">
            <span>Подытог</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.delivery_type === 'delivery' && (
            <div className="flex justify-between text-cream-300">
              <span>Доставка</span>
              <span>{order.delivery_fee > 0 ? formatPrice(order.delivery_fee) : 'Бесплатно'}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 font-serif text-2xl text-cream-50">
            <span>Итого</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link href="/menu" className="btn btn-ghost">
            Вернуться в меню
          </Link>
        </div>
      </div>
    </div>
  );
}