'use client';

import { MAX_ITEM_QUANTITY } from '@/lib/config';

type Props = {
  value: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md';
};

export default function QuantityControl({ value, onChange, size = 'md' }: Props) {
  const btn =
    size === 'sm'
      ? 'h-8 w-8 text-base'
      : 'h-10 w-10 text-lg';

  return (
    <div className="inline-flex items-center rounded-full border border-cream-200/20 bg-ink-900/70">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className={`${btn} flex items-center justify-center rounded-full text-cream-100 transition hover:bg-wine-700/50`}
        aria-label="Уменьшить количество"
      >
        −
      </button>
      <span className="min-w-[2rem] text-center text-sm font-medium tabular-nums text-cream-50">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_ITEM_QUANTITY}
        className={`${btn} flex items-center justify-center rounded-full text-cream-100 transition hover:bg-wine-700/50 disabled:opacity-40`}
        aria-label="Увеличить количество"
      >
        +
      </button>
    </div>
  );
}