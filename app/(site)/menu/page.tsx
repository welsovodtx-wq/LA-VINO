import type { Metadata } from 'next';
import Menu from '@/components/Menu';
import { createClient } from '@/lib/supabase/server';
import type { Category, Dish } from '@/lib/types';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Меню',
};

export default async function MenuPage() {
 const supabase = createClient();

  const [categoriesRes, dishesRes] = await Promise.all([
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order').order('name'),
    supabase.from('dishes').select('*').eq('is_available', true).order('sort_order').order('name'),
  ]);

  const failed = categoriesRes.error || dishesRes.error;
  if (failed) console.error('[menu] load error', categoriesRes.error ?? dishesRes.error);

  const categories = (categoriesRes.data ?? []) as Category[];
  const dishes = ((dishesRes.data ?? []) as Dish[]).map((d) => ({ ...d, price: Number(d.price) }));

  return (
    <div className="container-x py-16">
      <div className="mb-12 text-center">
        <p className="eyebrow">LA VINO</p>
        <h1 className="section-title mt-3">Меню</h1>
        <p className="mx-auto mt-4 max-w-xl text-cream-300">
          Блюда, которые хорошо звучат в компании бокала вина.
        </p>
      </div>
      {failed ? (
        <p className="card p-8 text-center text-cream-300">Не удалось загрузить меню. Попробуйте обновить страницу.</p>
      ) : (
        <Menu categories={categories} dishes={dishes} />
      )}
    </div>
  );
}