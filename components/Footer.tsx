import Link from 'next/link';
import { RESTAURANT } from '@/lib/config';

export default function Footer() {
  return (
    <footer className="border-t border-cream-200/10 bg-ink-950/80">
      <div className="container-x grid gap-8 py-12 text-sm text-cream-300 md:grid-cols-3">
        <div>
          <p className="font-serif text-2xl tracking-[0.3em] text-cream-50">
            LA <span className="text-wine-400">VINO</span>
          </p>
          <p className="mt-3 italic">Душевные разговоры с вином и вкусной едой.</p>
        </div>
        <div className="space-y-1">
          <p>{RESTAURANT.address}</p>
          <p>{RESTAURANT.phone}</p>
          <p>{RESTAURANT.hours}</p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <Link href="/menu" className="hover:text-gold-400">
            Меню
          </Link>
          <Link href="/cart" className="hover:text-gold-400">
            Корзина
          </Link>
          <p className="mt-4 text-xs text-cream-300/60">© {new Date().getFullYear()} LA VINO. 18+ Чрезмерное употребление алкоголя вредит вашему здоровью.</p>
        </div>
      </div>
    </footer>
  );
}