'use client';

import { useMemo, useState } from 'react';
import type { Category, Dish } from '@/lib/types';
import DishCard from './DishCard';

type Props = {
  categories: Category[];
  dishes: Dish[];
};

export default function Menu({ categories, dishes }: Props) {
  const [active, setActive] = useState<string>('all');

  const groups = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          dishes: dishes.filter((d) => d.category_id === category.id),
        }))
        .filter((g) => g.dishes.length > 0),
    [categories, dishes],
  );

  const visible = active === 'all' ? groups : groups.filter((g) => g.category.id === active);

  if (groups.length === 0) {
    return <p className="card p-8 text-center text-cream-300">Меню скоро появится.</p>;
  }

  const tabClass = (isActive: boolean) =>
    `whitespace-nowrap rounded-full border px-5 py-2 text-sm transition ${
      isActive
        ? 'border-wine-500 bg-wine-600 text-cream-50'
        : 'border-cream-200/15 text-cream-200 hover:border-gold-400 hover:text-gold-400'
    }`;

  return (
    <div>
      <div className="sticky top-16 z-30 -mx-4 mb-10 overflow-x-auto bg-ink-950/80 px-4 py-4 backdrop-blur-md sm:mx-0 sm:rounded-full sm:px-4">
        <div className="flex gap-3 sm:justify-center">
          <button type="button" onClick={() => setActive('all')} className={tabClass(active === 'all')}>
            Все
          </button>
          {groups.map(({ category }) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActive(category.id)}
              className={tabClass(active === category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-16">
        {visible.map(({ category, dishes: list }) => (
          <section key={category.id}>
            <div className="mb-6 flex items-center gap-4">
              <h2 className="font-serif text-3xl text-cream-50">{category.name}</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-wine-500/50 to-transparent" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((dish) => (
                <DishCard key={dish.id} dish={dish} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}