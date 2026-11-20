import 'server-only';
import { randomUUID } from 'crypto';
import type { OrderWithItems } from './types';

const API_URL = 'https://api.yookassa.ru/v3/';

export type YooPaymentStatus = 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';

export type YooPayment = {
  id: string;
  status: YooPaymentStatus;
  paid: boolean;
  amount: { value: string; currency: string };
  refunded_amount: { value: string; currency: string };
  confirmation: { type: string; confirmation_url: string };
  metadata: Record<string, string>;
  description: string;
};

function authHeader(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret) {
    throw new Error('ЮKassa не настроена: проверьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY');
  }
  return `Basic ${Buffer.from(`${shopId}:${secret}`).toString('base64')}`;
}

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

export async function createPayment(order: OrderWithItems): Promise<YooPayment> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  if (!siteUrl) {
    throw new Error('NEXT_PUBLIC_SITE_URL не настроен — нужен абсолютный URL для возврата с оплаты');
  }
  const vatCode = Number(process.env.YOOKASSA_VAT_CODE || 1);
  const taxSystemCode = process.env.YOOKASSA_TAX_SYSTEM_CODE
    ? Number(process.env.YOOKASSA_TAX_SYSTEM_CODE)
    : undefined;

  const items: Array<Record<string, unknown>> = order.order_items.map((item) => ({
    description: item.dish_name.slice(0, 128),
    quantity: item.quantity,
    amount: { value: money(Number(item.price)), currency: 'RUB' },
    vat_code: vatCode,
    payment_mode: 'full_payment',
    payment_subject: 'commodity',
  }));

  if (Number(order.delivery_fee) > 0) {
    items.push({
      description: 'Доставка',
      quantity: 1,
      amount: { value: money(Number(order.delivery_fee)), currency: 'RUB' },
      vat_code: vatCode,
      payment_mode: 'full_payment',
      payment_subject: 'service',
    });
  }

  const receipt: Record<string, unknown> = {
    customer: {
      full_name: order.customer_name.slice(0, 256),
      phone: `+${order.phone}`,
    },
    items,
  };
  if (taxSystemCode) receipt.tax_system_code = taxSystemCode;

  const body = {
    amount: { value: money(Number(order.total)), currency: 'RUB' },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: `${siteUrl}/checkout/success?order=${order.id}`,
    },
    description: `Заказ №${order.number} в LA VINO`,
    metadata: {
      order_id: order.id,
      order_number: String(order.number),
    },
    receipt,
  };

  const res = await fetch(`${API_URL}payments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Idempotence-Key': randomUUID(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ЮKassa ошибка создания платежа (${res.status}): ${text}`);
  }

  return (await res.json()) as YooPayment;
}

export async function getPayment(paymentId: string): Promise<YooPayment> {
  const res = await fetch(`${API_URL}payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: { Authorization: authHeader() },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ЮKassa ошибка получения платежа (${res.status}): ${text}`);
  }

  return (await res.json()) as YooPayment;
}
