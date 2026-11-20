import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from '@/components/admin/LoginForm';

export const metadata: Metadata = {
  title: 'Вход в админку',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md p-8 sm:p-10">
        <p className="text-center font-serif text-3xl tracking-[0.3em] text-cream-50">
          LA <span className="text-wine-400">VINO</span>
        </p>
        <p className="eyebrow mt-3 text-center">Панель управления</p>
        <Suspense fallback={<p className="mt-8 text-center text-cream-300">Загрузка…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}