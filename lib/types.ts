export type DeliveryType = 'delivery' | 'pickup';
export type PaymentMethod = 'online' | 'cash';
export type PaymentStatus = 'pending' | 'paid' | 'canceled' | 'refunded';
export type OrderStatus = 'new' | 'confirmed' | 'cooking' | 'delivering' | 'completed' | 'canceled';

export type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Dish = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  weight: number;
  unit: string;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type Order = {
  id: string;
  number: number;
  customer_name: string;
  phone: string;
  delivery_type: DeliveryType;
  address: string | null;
  comment: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  dish_id: string | null;
  dish_name: string;
  price: number;
  quantity: number;
  weight: number | null;
  unit: string | null;
  created_at?: string;
};

export type OrderWithItems = Order & { order_items: OrderItem[] };

export type CartItem = {
  id: string;
  name: string;
  price: number;
  weight: number;
  unit: string;
  image_url: string | null;
  quantity: number;
};