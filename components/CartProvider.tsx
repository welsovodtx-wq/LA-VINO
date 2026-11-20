'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartItem, Dish } from '@/lib/types';
import { MAX_ITEM_QUANTITY } from '@/lib/config';

const STORAGE_KEY = 'lavino-cart-v1';

type AddableDish = Pick<Dish, 'id' | 'name' | 'price' | 'weight' | 'unit' | 'image_url'>;

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  count: number;
  subtotal: number;
  add: (dish: AddableDish, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  getQuantity: (id: string) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.price === 'number' &&
    typeof v.quantity === 'number' &&
    v.quantity > 0
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter(isCartItem));
      }
    } catch {
      // повреждённые данные игнорируем
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage недоступен
    }
  }, [items, hydrated]);

  const add = useCallback((dish: AddableDish, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === dish.id);
      if (existing) {
        return prev.map((i) =>
          i.id === dish.id ? { ...i, quantity: Math.min(MAX_ITEM_QUANTITY, i.quantity + quantity) } : i,
        );
      }
      return [
        ...prev,
        {
          id: dish.id,
          name: dish.name,
          price: Number(dish.price),
          weight: dish.weight,
          unit: dish.unit,
          image_url: dish.image_url,
          quantity: Math.min(MAX_ITEM_QUANTITY, Math.max(1, quantity)),
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.id !== id);
      return prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(MAX_ITEM_QUANTITY, quantity) } : i));
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const getQuantity = useCallback((id: string) => items.find((i) => i.id === id)?.quantity ?? 0, [items]);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
    return { items, hydrated, count, subtotal, add, setQuantity, remove, clear, getQuantity };
  }, [items, hydrated, add, setQuantity, remove, clear, getQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart должен использоваться внутри CartProvider');
  return ctx;
}