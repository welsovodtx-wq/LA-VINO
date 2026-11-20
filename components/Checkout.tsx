'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useCart } from './CartProvider';
import { customerSchema } from '@/lib/validation';
import { calcDeliveryFee, FREE_DELIVERY_FROM, RESTAURANT } from '@/lib/config';
import { formatPrice } from '@/lib/format';
import type { DeliveryType, PaymentMethod } from '@/lib/types';

type FormState = {
  name: string;
  phone: string;
  deliveryType: DeliveryType;
  address: string;
  comment: string;
  paymentMethod: PaymentMethod;
};

type FieldKey = keyof FormState;
type Errors = Partial<Record<FieldKey, string>>;

function pickErrors(fieldErrors: Record<string, string[] | undefined>): Errors {
  const next: Errors = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages && messages[0]) next[key as FieldKey] = messages[0];
  }
  return next;
}

export default function Checkout() {
  const router = useRouter();
  const { items, subtotal, hydrated, clear, remove } = useCart();
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    deliveryType: 'delivery',
    address: '',
    comment: '',
    paymentMethod: 'online',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);

  const deliveryFee = calcDeliveryFee(subtotal, form.deliveryType);
  const total = subtotal + deliveryFee;

  function update<K extends FieldKey>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    const parsed = customerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(pickErrors(parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsed.data,
          items: items.map((i) => ({ dishId: i.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (Array.isArray(data.unavailable)) {
          (data.unavailable as string[]).forEach((id) => remove(id));
        }
        if (data.fieldErrors) setErrors(pickErrors(data.fieldErrors));
        setFormError(data.error ?? 'Не удалось оформить заказ. Попробуйте ещё раз.');
        setSubmitting(false);
        return;
      }

      setPlaced(true);
      clear();
      const successUrl = `/checkout/success?order=${data.orderId}`;

      if (parsed.data.paymentMethod === 'online') {
        const payRes = await fetch('/api/yookassa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId }),
        });
        const payData = await payRes.json().catch(() => ({}));
        if (payRes.ok && payData.confirmationUrl) {
          window.location.href = payData.confirmationUrl as string;
          return;
        }
        router.push(`${successUrl}&payment_error=1`);
        return;
      }

      router.push(successUrl);
    } catch {
      setFormError('Ошибка сети. Проверьте подключение и попробуйте ещё раз.');
      setSubmitting(false);
    }
  }

  if (!hydrated) return <p className="text-cream-300">Загрузка…</p>;

  if (placed) {
    return (
      <div className="card p-12 text-center">
        <p className="font-serif text-3xl text-cream-50">Заказ принят</p>
        <p className="mt-3 text-cream-300">Перенаправляем…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="font-serif text-3xl text-cream-50">Корзина пуста</p>
        {formError && <p className="mt-4 text-red-300">{formError}</p>}
        <Link href="/menu" className="btn btn-primary mt-8">
          Перейти в меню
        </Link>
      </div>
    );
  }

  const optionClass = (active: boolean) =>
    `flex-1 cursor-pointer rounded-xl border px-4 py-3 text-center text-sm transition ${
      active ? 'border-wine-500 bg-wine-700/40 text-cream-50' : 'border-cream-200/15 text-cream-200 hover:border-cream-200/40'
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="card space-y-6 p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="label">
              Имя
            </label>
            <input
              id="name"
              className={`input ${errors.name ? 'input-error' : ''}`}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              autoComplete="name"
              placeholder="Как к вам обращаться"
              maxLength={100}
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="phone" className="label">
              Телефон
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              className={`input ${errors.phone ? 'input-error' : ''}`}
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              autoComplete="tel"
              placeholder="+7 (931) 295-44-40"
              maxLength={20}
            />
            {errors.phone && <p className="field-error">{errors.phone}</p>}
          </div>
        </div>

        <div>
          <span className="label">Способ получения</span>
          <div className="flex gap-3">
            <label className={optionClass(form.deliveryType === 'delivery')}>
              <input
                type="radio"
                name="deliveryType"
                className="sr-only"
                checked={form.deliveryType === 'delivery'}
                onChange={() => update('deliveryType', 'delivery')}
              />
              Доставка
            </label>
            <label className={optionClass(form.deliveryType === 'pickup')}>
              <input
                type="radio"
                name="deliveryType"
                className="sr-only"
                checked={form.deliveryType === 'pickup'}
                onChange={() => update('deliveryType', 'pickup')}
              />
              Самовывоз
            </label>
          </div>
        </div>

        {form.deliveryType === 'delivery' ? (
          <div>
            <label htmlFor="address" className="label">
              Адрес доставки
            </label>
            <input
              id="address"
              className={`input ${errors.address ? 'input-error' : ''}`}
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              autoComplete="street-address"
              placeholder="Улица, дом, подъезд, этаж, квартира"
              maxLength={300}
            />
            {errors.address && <p className="field-error">{errors.address}</p>}
          </div>
        ) : (
          <p className="rounded-xl bg-ink-800/70 p-4 text-sm text-cream-300">
            Самовывоз: {RESTAURANT.address}. {RESTAURANT.hours}.
          </p>
        )}

        <div>
          <span className="label">Оплата</span>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className={optionClass(form.paymentMethod === 'online')}>
              <input
                type="radio"
                name="paymentMethod"
                className="sr-only"
                checked={form.paymentMethod === 'online'}
                onChange={() => update('paymentMethod', 'online')}
              />
              Онлайн картой / СБП
            </label>
            <label className={optionClass(form.paymentMethod === 'cash')}>
              <input
                type="radio"
                name="paymentMethod"
                className="sr-only"
                checked={form.paymentMethod === 'cash'}
                onChange={() => update('paymentMethod', 'cash')}
              />
              При получении
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="comment" className="label">
            Комментарий
          </label>
          <textarea
            id="comment"
            rows={3}
            className={`input resize-none ${errors.comment ? 'input-error' : ''}`}
            value={form.comment}
            onChange={(e) => update('comment', e.target.value)}
            placeholder="Пожелания к заказу, код домофона"
            maxLength={500}
          />
          {errors.comment && <p className="field-error">{errors.comment}</p>}
        </div>
      </div>

      <aside className="card h-fit p-6 lg:sticky lg:top-24">
        <h2 className="font-serif text-2xl text-cream-50">Ваш заказ</h2>
        <ul className="mt-5 space-y-3 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span className="text-cream-200">
                {item.name} <span className="text-cream-300/70">× {item.quantity}</span>
              </span>
              <span className="whitespace-nowrap text-cream-50">{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 space-y-2 border-t border-cream-200/10 pt-5 text-sm">
          <div className="flex justify-between text-cream-300">
            <span>Подытог</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {form.deliveryType === 'delivery' && (
            <div className="flex justify-between text-cream-300">
              <span>Доставка</span>
              <span>{deliveryFee > 0 ? formatPrice(deliveryFee) : 'Бесплатно'}</span>
            </div>
          )}
          {form.deliveryType === 'delivery' && deliveryFee > 0 && (
            <p className="text-xs text-cream-300/70">Бесплатно от {formatPrice(FREE_DELIVERY_FROM)}</p>
          )}
        </div>
        <div className="mt-5 flex justify-between font-serif text-3xl text-cream-50">
          <span>Итого</span>
          <span>{formatPrice(total)}</span>
        </div>

        {formError && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{formError}</p>}

        <button type="submit" disabled={submitting} className="btn btn-primary mt-6 w-full">
          {submitting ? 'Оформляем…' : form.paymentMethod === 'online' ? 'Перейти к оплате' : 'Оформить заказ'}
        </button>
        <p className="mt-3 text-center text-xs text-cream-300/60">
          Нажимая кнопку, вы соглашаетесь на обработку персональных данных.
        </p>
      </aside>
    </form>
  );
}