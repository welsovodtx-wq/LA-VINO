import Link from 'next/link';
import { RESTAURANT } from '@/lib/config';
import { createClient } from '@/lib/supabase/server';
const features = [
  {
    title: 'Винная карта',
    text: 'Подбираем вино к каждому блюду — от лёгких белых до глубоких красных.',
  },
  {
    title: 'Авторская кухня',
    text: 'Итальянская классика и сезонные блюда из свежих продуктов.',
  },
  {
    title: 'Доставка и самовывоз',
    text: 'Привезём горячим или соберём к вашему приходу.',
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-wine-900/40 via-transparent to-transparent" />
        <div className="container-x relative flex min-h-[78vh] flex-col items-center justify-center py-24 text-center">
          <p className="eyebrow mb-6">Ресторан · Вино · Кухня</p>
          <h1 className="font-serif text-6xl tracking-[0.25em] text-cream-50 sm:text-8xl">
            LA <span className="text-wine-400">VINO</span>
          </h1>
          <div className="my-10 h-px w-24 bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
          <blockquote className="max-w-3xl font-serif text-2xl italic leading-relaxed text-cream-200 sm:text-4xl">
            «LA VINO — это про душевные разговоры с вином и вкусной едой»
          </blockquote>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link href="/menu" className="btn btn-primary">
              Смотреть меню
            </Link>
            <Link href="/cart" className="btn btn-ghost">
              Корзина
            </Link>
          </div>
        </div>
      </section>

      <section className="container-x py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-8">
              <div className="mb-4 h-px w-10 bg-gold-400" />
              <h3 className="font-serif text-2xl text-cream-50">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-cream-300">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x pb-24">
        <div className="card grid gap-8 overflow-hidden bg-gradient-to-br from-wine-900/70 to-ink-900/80 p-10 md:grid-cols-2 md:p-14">
          <div>
            <p className="eyebrow">Ждём в гости</p>
            <h2 className="section-title mt-4">Вечер, который хочется продлить</h2>
            <p className="mt-6 max-w-md leading-relaxed text-cream-300">
              Тёплый свет, бокал хорошего вина и блюда, ради которых возвращаются. Закажите домой или приходите к нам.
            </p>
          </div>
          <dl className="grid content-center gap-6 text-sm">
            <div>
              <dt className="label">Адрес</dt>
              <dd className="text-lg text-cream-50">{RESTAURANT.address}</dd>
            </div>
            <div>
              <dt className="label">Телефон</dt>
              <dd className="text-lg text-cream-50">{RESTAURANT.phone}</dd>
            </div>
            <div>
              <dt className="label">Часы работы</dt>
              <dd className="text-lg text-cream-50">{RESTAURANT.hours}</dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}