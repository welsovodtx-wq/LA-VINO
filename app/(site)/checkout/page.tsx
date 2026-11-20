import type { Metadata } from 'next';
import Checkout from '@/components/Checkout';

export const metadata: Metadata = {
  title: 'Оформление заказа',
};

export default function CheckoutPage() {
  return (
    <div className="container-x py-16">
      <h1 className="section-title mb-10">Оформление заказа</h1>
      <Checkout />
    </div>
  );
}