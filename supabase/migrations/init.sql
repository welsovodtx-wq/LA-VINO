-- LA VINO: базовая схема

create extension if not exists "pgcrypto";

-- Админ определяется по app_metadata.role = 'admin' в JWT
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Категории
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Блюда
create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 150),
  description text,
  price numeric(10, 2) not null check (price >= 0),
  weight integer not null check (weight > 0),
  unit text not null default 'г' check (unit in ('г', 'мл', 'шт', 'кг', 'л')),
  image_url text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dishes_category_id_idx on public.dishes (category_id);

-- Заказы
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  phone text not null check (phone ~ '^7[0-9]{10}$'),
  delivery_type text not null check (delivery_type in ('delivery', 'pickup')),
  address text,
  comment text check (comment is null or char_length(comment) <= 500),
  payment_method text not null check (payment_method in ('online', 'cash')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'canceled', 'refunded')),
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'cooking', 'delivering', 'completed', 'canceled')),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(10, 2) not null check (total >= 0),
  payment_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_address_required
    check (delivery_type = 'pickup' or (address is not null and char_length(address) >= 5))
);

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);

-- Позиции заказа (снимок цены и названия на момент заказа)
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  dish_id uuid references public.dishes(id) on delete set null,
  dish_name text not null,
  price numeric(10, 2) not null check (price >= 0),
  quantity integer not null check (quantity between 1 and 100),
  weight integer,
  unit text,
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);

-- Триггеры updated_at
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create trigger dishes_set_updated_at
  before update on public.dishes
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- RLS
alter table public.categories enable row level security;
alter table public.dishes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Категории: все читают активные, админ — всё
create policy "categories_public_read"
  on public.categories for select
  to anon, authenticated
  using (is_active);

create policy "categories_admin_all"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Блюда: все читают доступные из активных категорий, админ — всё
create policy "dishes_public_read"
  on public.dishes for select
  to anon, authenticated
  using (
    is_available
    and exists (
      select 1 from public.categories c
      where c.id = dishes.category_id and c.is_active
    )
  );

create policy "dishes_admin_all"
  on public.dishes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Заказы: аноним может только создать заказ в начальном статусе, админ — всё
create policy "orders_public_insert"
  on public.orders for insert
  to anon, authenticated
  with check (
    status = 'new'
    and payment_status = 'pending'
    and payment_id is null
  );

create policy "orders_admin_all"
  on public.orders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Позиции заказа: аноним может только создавать, админ — всё
create policy "order_items_public_insert"
  on public.order_items for insert
  to anon, authenticated
  with check (quantity > 0 and price >= 0);

create policy "order_items_admin_all"
  on public.order_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Права
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.dishes to anon;
grant insert on public.orders, public.order_items to anon;
grant select, insert, update, delete
  on public.categories, public.dishes, public.orders, public.order_items
  to authenticated;