import 'server-only';
import { Resend } from 'resend';
import type { OrderWithItems } from './types';
import { DELIVERY_TYPE_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from './config';
import { formatDateTime, formatPhone, formatPrice } from './format';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTelegramOrder(order: OrderWithItems): string {
  const lines: string[] = [];
  lines.push(`🍷 <b>Новый заказ №${order.number}</b>`);
  lines.push(`🕒 ${escapeHtml(formatDateTime(order.created_at))}`);
  lines.push('');
  lines.push(`👤 ${escapeHtml(order.customer_name)}`);
  lines.push(`📞 ${escapeHtml(formatPhone(order.phone))}`);
  if (order.delivery_type === 'delivery') {
    lines.push(`🚚 Доставка: ${escapeHtml(order.address ?? '')}`);
  } else {
    lines.push('🏃 Самовывоз');
  }
  lines.push(
    `💳 ${escapeHtml(PAYMENT_METHOD_LABELS[order.payment_method])} — ${escapeHtml(PAYMENT_STATUS_LABELS[order.payment_status])}`,
  );
  if (order.comment) lines.push(`💬 ${escapeHtml(order.comment)}`);
  lines.push('');
  lines.push('<b>Состав:</b>');
  for (const item of order.order_items) {
    lines.push(
      `• ${escapeHtml(item.dish_name)} × ${item.quantity} = ${escapeHtml(formatPrice(Number(item.price) * item.quantity))}`,
    );
  }
  lines.push('');
  lines.push(`Подытог: ${escapeHtml(formatPrice(order.subtotal))}`);
  if (order.delivery_type === 'delivery') {
    lines.push(`Доставка: ${escapeHtml(formatPrice(order.delivery_fee))}`);
  }
  lines.push(`<b>Итого: ${escapeHtml(formatPrice(order.total))}</b>`);
  return lines.join('\n');
}

function formatEmailOrder(order: OrderWithItems): string {
  const rows = order.order_items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(item.dish_name)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(formatPrice(Number(item.price)))}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(formatPrice(Number(item.price) * item.quantity))}</td>
        </tr>`,
    )
    .join('');

  const delivery =
    order.delivery_type === 'delivery'
      ? `Доставка: ${escapeHtml(order.address ?? '')}`
      : 'Самовывоз';

  return `
  <div style="font-family:Georgia,serif;max-width:640px;margin:0 auto;color:#1c1517;">
    <div style="background:#330e17;color:#f5ecdf;padding:24px;text-align:center;">
      <h1 style="margin:0;letter-spacing:6px;font-weight:normal;">LA VINO</h1>
      <p style="margin:8px 0 0;">Новый заказ №${order.number}</p>
    </div>
    <div style="padding:24px;background:#fdfaf5;">
      <p><b>Дата:</b> ${escapeHtml(formatDateTime(order.created_at))}</p>
      <p><b>Клиент:</b> ${escapeHtml(order.customer_name)}</p>
      <p><b>Телефон:</b> ${escapeHtml(formatPhone(order.phone))}</p>
      <p><b>Получение:</b> ${escapeHtml(DELIVERY_TYPE_LABELS[order.delivery_type])}. ${delivery}</p>
      <p><b>Оплата:</b> ${escapeHtml(PAYMENT_METHOD_LABELS[order.payment_method])} — ${escapeHtml(PAYMENT_STATUS_LABELS[order.payment_status])}</p>
      ${order.comment ? `<p><b>Комментарий:</b> ${escapeHtml(order.comment)}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-family:Arial,sans-serif;font-size:14px;">
        <thead>
          <tr style="background:#f5e1e4;">
            <th style="padding:8px;text-align:left;">Блюдо</th>
            <th style="padding:8px;">Кол-во</th>
            <th style="padding:8px;text-align:right;">Цена</th>
            <th style="padding:8px;text-align:right;">Сумма</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="text-align:right;margin-top:16px;">Подытог: ${escapeHtml(formatPrice(order.subtotal))}</p>
      ${order.delivery_type === 'delivery' ? `<p style="text-align:right;">Доставка: ${escapeHtml(formatPrice(order.delivery_fee))}</p>` : ''}
      <p style="text-align:right;font-size:18px;"><b>Итого: ${escapeHtml(formatPrice(order.total))}</b></p>
    </div>
  </div>`;
}

export async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error('Telegram не настроен');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4000),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API ${res.status}: ${body}`);
  }
}

export async function sendOrderEmail(order: OrderWithItems): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = (process.env.ORDER_NOTIFY_EMAIL ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!apiKey || !from || to.length === 0) throw new Error('Resend не настроен');

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Новый заказ №${order.number} — ${formatPrice(order.total)}`,
    html: formatEmailOrder(order),
  });

  if (error) throw new Error(`Resend: ${error.message}`);
}

export type NotifyResult = { email: boolean; telegram: boolean };

export async function notifyNewOrder(order: OrderWithItems): Promise<NotifyResult> {
  const [email, telegram] = await Promise.allSettled([
    sendOrderEmail(order),
    sendTelegram(formatTelegramOrder(order)),
  ]);

  if (email.status === 'rejected') console.error(`[notify] email failed for order ${order.number}`, email.reason);
  if (telegram.status === 'rejected') console.error(`[notify] telegram failed for order ${order.number}`, telegram.reason);

  return {
    email: email.status === 'fulfilled',
    telegram: telegram.status === 'fulfilled',
  };
}
