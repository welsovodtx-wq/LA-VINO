-- Тестовые данные LA VINO

insert into public.categories (name, slug, sort_order)
values
  ('Пицца', 'pizza', 1),
  ('Салаты', 'salads', 2),
  ('Напитки', 'drinks', 3)
on conflict (slug) do nothing;

insert into public.dishes (category_id, name, description, price, weight, unit, image_url, sort_order)
select c.id, v.name, v.description, v.price, v.weight, v.unit, v.image_url, v.sort_order
from (
  values
    ('pizza', 'Пицца Пепперони', 'Томатный соус, моцарелла, пикантная пепперони', 600.00::numeric, 500, 'г', null::text, 1),
    ('salads', 'Салат Цезарь', 'Романо, курица, пармезан, гренки, соус цезарь', 500.00::numeric, 200, 'г', null::text, 1),
    ('drinks', 'Кола', 'Охлаждённая классическая кола', 200.00::numeric, 330, 'мл', null::text, 1)
) as v(slug, name, description, price, weight, unit, image_url, sort_order)
join public.categories c on c.slug = v.slug
where not exists (
  select 1 from public.dishes d where d.name = v.name
);

-- Назначение администратора (выполнить после регистрации пользователя в Supabase Auth,
-- затем перелогиниться, чтобы роль попала в JWT):
-- update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
--   where email = 'admin@lavino.example.com';