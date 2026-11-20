'use client';

import { useState } from 'react';

export default function PayButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/yookassa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.confirmationUrl) {
        window.location.href = data.confirmationUrl as string;
        return;
      }
      setError(data.error ?? 'Не удалось создать платёж');
    } catch {
      setError('Ошибка сети');
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={pay} disabled={loading} className="btn btn-primary">
        {loading ? 'Переходим…' : 'Оплатить онлайн'}
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}