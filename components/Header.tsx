'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from './CartProvider';

const links = [
  { href: '/', label: 'Главная' },
  { href: '/menu', label: 'Меню' },
];

export default function Header() {
  const pathname = usePathname();
  const { count, hydrated } = useCart();

  const linkClass = (href: string) =>
    `transition hover:text-gold-400 ${pathname === href ? 'text-gold-400' : 'text-cream-200'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-cream-200/10 bg-ink-950/80 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-serif text-xl tracking-[0.35em] text-cream-50 sm:text-2xl">
          LA <span className="text-wine-400">VINO</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm sm:gap-8">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
          <Link href="/cart" className={`relative flex items-center gap-2 ${linkClass('/cart')}`}>
            Корзина
            {hydrated && count > 0 && (
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-wine-600 px-1.5 text-[11px] font-semibold text-cream-50">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}