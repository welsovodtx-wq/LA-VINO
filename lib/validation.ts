import { z } from 'zod';
import { MAX_ITEM_QUANTITY } from './config';

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `7${digits}`;
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) return `7${digits.slice(1)}`;
  return digits;
}

const customerBase = z.object({
  name: z
    .string({ required_error: 'Укажите имя' })
    .trim()
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(100, 'Слишком длинное имя'),
  phone: z
    .string({ required_error: 'Укажите телефон' })
    .trim()
    .refine((v) => /^7\d{10}$/.test(normalizePhone(v)), 'Введите корректный номер телефона'),
  deliveryType: z.enum(['delivery', 'pickup'], { errorMap: () => ({ message: 'Выберите способ получения' }) }),
  address: z.string().trim().max(300, 'Слишком длинный адрес').default(''),
  comment: z.string().trim().max(500, 'Комментарий не длиннее 500 символов').default(''),
  paymentMethod: z.enum(['online', 'cash'], { errorMap: () => ({ message: 'Выберите способ оплаты' }) }),
});

function addressRefine(data: { deliveryType: string; address: string }, ctx: z.RefinementCtx) {
  if (data.deliveryType === 'delivery' && data.address.length < 5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['address'],
      message: 'Укажите адрес доставки',
    });
  }
}

export const customerSchema = customerBase.superRefine(addressRefine);

export const orderSchema = customerBase
  .extend({
    items: z
      .array(
        z.object({
          dishId: z.string().uuid(),
          quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
        }),
      )
      .min(1, 'Корзина пуста')
      .max(50, 'Слишком много позиций'),
  })
  .superRefine(addressRefine);

export type CustomerInput = z.infer<typeof customerSchema>;
export type OrderInput = z.infer<typeof orderSchema>;