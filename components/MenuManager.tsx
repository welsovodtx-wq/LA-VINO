'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Category, Dish } from '@/lib/types';
import { DISH_UNITS } from '@/lib/config';
import { formatPrice } from '@/lib/format';

type DishForm = {
  id: string | null;
  category_id: string;
  name: string;
  description: string;
  price: string;
  weight: string;
  unit: string;
  image_url: string;
  is_available: boolean;
  sort_order: string;
};

const emptyForm = (categoryId = ''): DishForm => ({
  id: null,
  category_id: categoryId,
  name: '',
  description: '',
  price: '',
  weight: '',
  unit: 'г',
  image_url: '',
  is_available: true,
  sort_order: '0',
});

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `category-${Date.now()}`;
}

export default function MenuManager() {
  const supabase = useMemo(() => createClient(), []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<DishForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const [c, d] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order').order('name'),
      supabase.from('dishes').select('*').order('sort_order').order('name'),
    ]);
    if (c.error || d.error) {
      setError(c.error?.message ?? d.error?.message ?? 'Ошибка загрузки');
    } else {
      setError(null);
      setCategories((c.data ?? []) as Category[]);
      setDishes(((d.data ?? []) as Dish[]).map((x) => ({ ...x, price: Number(x.price) })));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const categoryName = useCallback(
    (id: string) => categories.find((c) => c.id === id)?.name ?? '—',
    [categories],
  );

  const visibleDishes = filter === 'all' ? dishes : dishes.filter((d) => d.category_id === filter);

  function startCreate() {
    setFormError(null);
    setForm(emptyForm(filter !== 'all' ? filter : categories[0]?.id ?? ''));
  }

  function startEdit(dish: Dish) {
    setFormError(null);
    setForm({
      id: dish.id,
      category_id: dish.category_id,
      name: dish.name,
      description: dish.description ?? '',
      price: String(dish.price),
      weight: String(dish.weight),
      unit: dish.unit,
      image_url: dish.image_url ?? '',
      is_available: dish.is_available,
      sort_order: String(dish.sort_order),
    });
  }

  function updateForm<K extends keyof DishForm>(key: K, value: DishForm[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function saveDish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    setFormError(null);

    const name = form.name.trim();
    const price = Number(form.price.replace(',', '.'));
    const weight = parseInt(form.weight, 10);
    const sortOrder = parseInt(form.sort_order, 10) || 0;
    const imageUrl = form.image_url.trim();

    if (!form.category_id) return setFormError('Выберите категорию');
    if (name.length < 1 || name.length > 150) return setFormError('Название: от 1 до 150 символов');
    if (!Number.isFinite(price) || price < 0) return setFormError('Укажите корректную цену');
    if (!Number.isInteger(weight) || weight <= 0) return setFormError('Укажите вес/объём целым числом больше 0');
    if (!(DISH_UNITS as readonly string[]).includes(form.unit)) return setFormError('Некорректная единица измерения');
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) return setFormError('Ссылка на фото должна начинаться с http(s)://');

    const payload = {
      category_id: form.category_id,
      name,
      description: form.description.trim() || null,
      price: Math.round(price * 100) / 100,
      weight,
      unit: form.unit,
      image_url: imageUrl || null,
      is_available: form.is_available,
      sort_order: sortOrder,
    };

    setSaving(true);
    const { error: saveError } = form.id
      ? await supabase.from('dishes').update(payload).eq('id', form.id)
      : await supabase.from('dishes').insert(payload);
    setSaving(false);

    if (saveError) {
      setFormError(saveError.message);
      return;
    }

    setNotice(form.id ? 'Блюдо обновлено' : 'Блюдо добавлено');
    setForm(null);
    void load();
  }

  async function deleteDish(dish: Dish) {
    if (!window.confirm(`Удалить «${dish.name}»? В старых заказах блюдо сохранится по названию.`)) return;
    const { error: deleteError } = await supabase.from('dishes').delete().eq('id', dish.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setNotice('Блюдо удалено');
    void load();
  }

  async function toggleDish(dish: Dish) {
    const { error: toggleError } = await supabase
      .from('dishes')
      .update({ is_available: !dish.is_available })
      .eq('id', dish.id);
    if (toggleError) {
      setError(toggleError.message);
      return;
    }
    setDishes((list) => list.map((d) => (d.id === dish.id ? { ...d, is_available: !d.is_available } : d)));
  }

  async function addCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    const baseSlug = slugify(name);
    const slug = categories.some((c) => c.slug === baseSlug) ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;
    const sortOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1;
    const { error: insertError } = await supabase.from('categories').insert({ name, slug, sort_order: sortOrder });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNewCategory('');
    setNotice('Категория добавлена');
    void load();
  }

  async function toggleCategory(category: Category) {
    const { error: toggleError } = await supabase
      .from('categories')
      .update({ is_active: !category.is_active })
      .eq('id', category.id);
    if (toggleError) {
      setError(toggleError.message);
      return;
    }
    setCategories((list) => list.map((c) => (c.id === category.id ? { ...c, is_active: !c.is_active } : c)));
  }

  async function renameCategory(category: Category) {
    const name = window.prompt('Новое название категории', category.name)?.trim();
    if (!name || name === category.name) return;
    const { error: renameError } = await supabase.from('categories').update({ name }).eq('id', category.id);
    if (renameError) {
      setError(renameError.message);
      return;
    }
    setCategories((list) => list.map((c) => (c.id === category.id ? { ...c, name } : c)));
  }

  async function deleteCategory(category: Category) {
    if (dishes.some((d) => d.category_id === category.id)) {
      setError('Нельзя удалить категорию, в которой есть блюда. Сначала перенесите или удалите блюда.');
      return;
    }
    if (!window.confirm(`Удалить категорию «${category.name}»?`)) return;
    const { error: deleteError } = await supabase.from('categories').delete().eq('id', category.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (filter === category.id) setFilter('all');
    setNotice('Категория удалена');
    void load();
  }

  if (loading && categories.length === 0) {
    return <p className="text-cream-300">Загрузка меню…</p>;
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
          {error}{' '}
          <button type="button" className="underline" onClick={() => setError(null)}>
            Скрыть
          </button>
        </p>
      )}
      {notice && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}

      <section className="card p-6">
        <h2 className="font-serif text-2xl text-cream-50">Категории</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {categories.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm ${
                c.is_active ? 'border-cream-200/20 text-cream-100' : 'border-cream-200/10 text-cream-300/50 line-through'
              }`}
            >
              <button type="button" onClick={() => void renameCategory(c)} className="hover:text-gold-400" title="Переименовать">
                {c.name}
              </button>
              <button
                type="button"
                onClick={() => void toggleCategory(c)}
                className="text-xs text-cream-300 hover:text-gold-400"
                title={c.is_active ? 'Скрыть' : 'Показать'}
              >
                {c.is_active ? '◉' : '○'}
              </button>
              <button
                type="button"
                onClick={() => void deleteCategory(c)}
                className="text-xs text-cream-300 hover:text-red-300"
                title="Удалить"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addCategory} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="input sm:max-w-xs"
            placeholder="Новая категория"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            maxLength={100}
          />
          <button type="submit" className="btn btn-ghost">
            Добавить категорию
          </button>
        </form>
      </section>

      {form && (
        <section className="card border-wine-500/40 p-6">
          <h2 className="font-serif text-2xl text-cream-50">{form.id ? 'Редактирование блюда' : 'Новое блюдо'}</h2>
          <form onSubmit={saveDish} noValidate className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="dish-name">
                Название
              </label>
              <input
                id="dish-name"
                className="input"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                maxLength={150}
              />
            </div>
            <div>
              <label className="label" htmlFor="dish-category">
                Категория
              </label>
              <select
                id="dish-category"
                className="input"
                value={form.category_id}
                onChange={(e) => updateForm('category_id', e.target.value)}
              >
                <option value="">— выберите —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="dish-description">
                Описание
              </label>
              <textarea
                id="dish-description"
                rows={2}
                className="input resize-none"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                maxLength={500}
              />
            </div>
            <div>
              <label className="label" htmlFor="dish-price">
                Цена, ₽
              </label>
              <input
                id="dish-price"
                inputMode="decimal"
                className="input"
                value={form.price}
                onChange={(e) => updateForm('price', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <div>
                <label className="label" htmlFor="dish-weight">
                  Вес / объём
                </label>
                <input
                  id="dish-weight"
                  inputMode="numeric"
                  className="input"
                  value={form.weight}
                  onChange={(e) => updateForm('weight', e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="dish-unit">
                  Ед.
                </label>
                <select
                  id="dish-unit"
                  className="input"
                  value={form.unit}
                  onChange={(e) => updateForm('unit', e.target.value)}
                >
                  {DISH_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="dish-image">
                Ссылка на фото
              </label>
              <input
                id="dish-image"
                className="input"
                placeholder="https://..."
                value={form.image_url}
                onChange={(e) => updateForm('image_url', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 items-end gap-3">
              <div>
                <label className="label" htmlFor="dish-sort">
                  Порядок
                </label>
                <input
                  id="dish-sort"
                  inputMode="numeric"
                  className="input"
                  value={form.sort_order}
                  onChange={(e) => updateForm('sort_order', e.target.value)}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3 pb-3 text-sm text-cream-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-wine-500"
                  checked={form.is_available}
                  onChange={(e) => updateForm('is_available', e.target.checked)}
                />
                В продаже
              </label>
            </div>

            {formError && (
              <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300 md:col-span-2">{formError}</p>
            )}

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>
              <button type="button" onClick={() => setForm(null)} className="btn btn-ghost">
                Отмена
              </button>
            </div>
          </form>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-full border px-4 py-1.5 text-xs ${
                filter === 'all' ? 'border-wine-500 bg-wine-600 text-cream-50' : 'border-cream-200/15 text-cream-200'
              }`}
            >
              Все ({dishes.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                className={`rounded-full border px-4 py-1.5 text-xs ${
                  filter === c.id ? 'border-wine-500 bg-wine-600 text-cream-50' : 'border-cream-200/15 text-cream-200'
                }`}
              >
                {c.name} ({dishes.filter((d) => d.category_id === c.id).length})
              </button>
            ))}
          </div>
          <button type="button" onClick={startCreate} disabled={categories.length === 0} className="btn btn-primary btn-sm">
            + Добавить блюдо
          </button>
        </div>

        {categories.length === 0 && (
          <p className="card mb-4 p-6 text-center text-cream-300">Сначала создайте хотя бы одну категорию.</p>
        )}

        {visibleDishes.length === 0 ? (
          <p className="card p-8 text-center text-cream-300">Блюд нет</p>
        ) : (
          <div className="card divide-y divide-cream-200/10">
            {visibleDishes.map((dish) => (
              <div key={dish.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-wine-800 to-ink-900">
                  {dish.image_url ? (
                    <img src={dish.image_url} alt={dish.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center font-serif italic text-wine-300/50">LV</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-serif text-lg ${dish.is_available ? 'text-cream-50' : 'text-cream-300/50 line-through'}`}>
                    {dish.name}
                  </p>
                  <p className="text-xs text-cream-300">
                    {categoryName(dish.category_id)} · {dish.weight} {dish.unit} · порядок {dish.sort_order}
                  </p>
                </div>
                <p className="w-24 text-right font-serif text-lg text-gold-400">{formatPrice(dish.price)}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void toggleDish(dish)} className="btn btn-ghost btn-sm">
                    {dish.is_available ? 'Скрыть' : 'Вернуть'}
                  </button>
                  <button type="button" onClick={() => startEdit(dish)} className="btn btn-ghost btn-sm">
                    Изменить
                  </button>
                  <button type="button" onClick={() => void deleteDish(dish)} className="btn btn-danger btn-sm">
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}