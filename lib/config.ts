import type { DeliveryType, OrderStatus, PaymentMethod, PaymentStatus } from './types';

export const DELIVERY_FEE = 200;
export const FREE_DELIVERY_FROM = 2000;
export const MAX_ITEM_QUANTITY = 50;

export function calcDeliveryFee(subtotal: number, deliveryType: DeliveryType): number {
  if (deliveryType === 'pickup') return 0;
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
}

export const RESTAURANT = {
  name: 'LA VINO',
  address: 'Москва, ул. Винная, 1',
  phone: '+7 (900) 000-00-00',
  hours: 'Ежедневно 12:00 — 00:00',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  cooking: 'Готовится',
  delivering: 'В пути',
  completed: 'Выполнен',
  canceled: 'Отменён',
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачен',
  canceled: 'Оплата отменена',
  refunded: 'Возврат',
};

export const PAYMENT_STATUSES = Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  online: 'Онлайн (ЮKassa)',
  cash: 'При получении',
};

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  delivery: 'Доставка',
  pickup: 'Самовывоз',
};

export const DISH_UNITS = ['г', 'мл', 'шт', 'кг', 'л'] as const;
