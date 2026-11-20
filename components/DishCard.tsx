'use client';

import type { Dish } from '@/lib/types';
import { formatPrice } from '@/lib/format';
import { useCart } from './CartProvider';
import QuantityControl from './QuantityControl';

export default function DishCard({ dish }: { dish: Dish }) {
  const { add, setQuantity, getQuantity, hydrated } = useCart();
  const quantity = hydrated ? getQuantity(dish.id) : 0;

  return (
    <article className="card group flex flex-col overflow-hidden transition hover:border-wine-500/40">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-wine-800 via-wine-900 to-ink-900">
        {dish.image_url ? (
          <img
            src={dish.image_url}
            alt={dish.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-serif text-5xl italic text-wine-300/40">LV</span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-ink-950/70 px-3 py-1 text-xs text-cream-200 backdrop-blur">
          {dish.weight} {dish.unit}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-2xl leading-tight text-cream-50">{dish.name}</h3>
        {dish.description && <p className="mt-2 text-sm leading-relaxed text-cream-300">{dish.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="font-serif text-2xl text-gold-400">{formatPrice(dish.price)}</span>
          {quantity > 0 ? (
            <QuantityControl value={quantity} onChange={(q) => setQuantity(dish.id, q)} size="sm" />
          ) : (
            <button type="button" onClick={() => add(dish)} className="btn btn-primary btn-sm">
              В корзину
            </button>
          )}
        </div>
      </div>
    </article>
  );
}