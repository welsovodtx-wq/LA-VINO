'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from './LogoutButton';

const links = [
  { href: '/admin', label: 'Заказы' },
  { href: '/admin/menu', label: 'Меню' },
];

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-cream-200/10 bg-ink-950/90 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/admin" className="font-serif text-xl tracking-[0.3em] text-cream-50">
            LA <span className="text-wine-400">VINO</span>
          </Link>
          <nav className="flex gap-5 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={pathname === l.href ? 'text-gold-400' : 'text-cream-200 hover:text-gold-400'}
              >
                {l.label}
              </Link>
            ))}
            <Link href="/" target="_blank" className="text-cream-300/70 hover:text-gold-400">
              Сайт ↗
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-cream-300 sm:inline">{email}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}