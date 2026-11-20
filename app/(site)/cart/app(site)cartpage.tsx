import type { Metadata } from 'next';
import Cart from '@/components/Cart';

export const metadata: Metadata = {
  title: 'Корзина',
};

export default function CartPage() {
  return (
    <div className="container-x py-16">
      <h1 className="section-title mb-10">Корзина</h1>
      <Cart />
    </div>
  );
}