'use client';

import Link from 'next/link';
import { useCart } from './CartProvider';
import QuantityControl from './QuantityControl';
import { formatPrice } from '@/lib/format';
import { DELIVERY_FEE, FREE_DELIVERY_FROM } from '@/lib/config';

export default function Cart() {
  const { items, hydrated, subtotal, count, setQuantity, remove, clear } = useCart();

  if (!hydrated) {
    return <p className="text-cream-300">Загрузка корзины…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="font-serif text-3xl text-cream-50">Корзина пуста</p>
        <p className="mt-3 text-cream-300">Загляните в меню — там есть кое-что к вашему вину.</p>
        <Link href="/menu" className="btn btn-primary mt-8">
          Перейти в меню
        </Link>
      </div>
    );
  }

  const leftForFree = FREE_DELIVERY_FROM - subtotal;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="card divide-y divide-cream-200/10">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-4 p-5 sm:flex-nowrap">
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-wine-800 to-ink-900">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center font-serif text-xl italic text-wine-300/50">LV</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-xl text-cream-50">{item.name}</p>
              <p className="text-sm text-cream-300">
                {item.weight} {item.unit} · {formatPrice(item.price)}
              </p>
            </div>
            <QuantityControl value={item.quantity} onChange={(q) => setQuantity(item.id, q)} size="sm" />
            <p className="w-24 text-right font-medium text-cream-50">{formatPrice(item.price * item.quantity)}</p>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="text-cream-300/70 transition hover:text-red-300"
              aria-label={`Удалить ${item.name}`}
            >
              ✕
            </button>
          </div>
        ))}
        <div className="flex justify-end p-5">
          <button type="button" onClick={clear} className="text-sm text-cream-300/70 hover:text-red-300">
            Очистить корзину
          </button>
        </div>
      </div>

      <aside className="card h-fit p-6 lg:sticky lg:top-24">
        <h2 className="font-serif text-2xl text-cream-50">Итого</h2>
        <div className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between text-cream-300">
            <span>Позиций</span>
            <span>{count}</span>
          </div>
          <div className="flex justify-between text-cream-300">
            <span>Сумма</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <p className="text-xs text-cream-300/70">
            {leftForFree > 0
              ? `Доставка ${formatPrice(DELIVERY_FEE)}. До бесплатной доставки — ${formatPrice(leftForFree)}.`
              : 'Доставка бесплатно.'}
          </p>
        </div>
        <div className="mt-6 flex justify-between border-t border-cream-200/10 pt-6 font-serif text-3xl text-cream-50">
          <span>Сумма</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <Link href="/checkout" className="btn btn-primary mt-6 w-full">
          Оформить заказ
        </Link>
        <Link href="/menu" className="btn btn-ghost mt-3 w-full">
          Продолжить выбор
        </Link>
      </aside>
    </div>
  );
}