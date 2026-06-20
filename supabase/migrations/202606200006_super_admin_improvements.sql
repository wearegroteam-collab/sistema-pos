alter type public.record_status add value if not exists 'deleted';

insert into public.businesses (
  id,
  name,
  email,
  phone,
  status,
  demo,
  test_mode,
  onboarding_completed,
  onboarding_skipped,
  currency,
  timezone
)
values (
  '00000000-0000-0000-0000-000000000001',
  'Mi Restaurante Demo',
  'demo@pos.com',
  '3000000000',
  'active',
  true,
  true,
  true,
  false,
  'COP',
  'America/Bogota'
)
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  phone = excluded.phone,
  status = excluded.status,
  demo = true,
  test_mode = true,
  onboarding_completed = true,
  updated_at = now();

insert into public.settings (business_id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (business_id) do nothing;

insert into public.categories (id, business_id, name)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Burgers'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Tacos'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Bebidas')
on conflict (id) do nothing;

insert into public.products (id, business_id, category_id, name, price, description, active)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Burger clasica', 25000, 'Carne, queso, lechuga', true),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Taco al pastor', 12000, 'Cerdo, pina, cilantro', true),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Agua fresca', 6000, '16 oz', true)
on conflict (id) do nothing;

insert into public.restaurant_tables (id, business_id, name, status, sort_order)
values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Mesa 1', 'libre', 1),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Mesa 2', 'libre', 2),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Barra', 'libre', 3)
on conflict (id) do nothing;

insert into public.business_users (
  business_id,
  user_id,
  email,
  full_name,
  role,
  status,
  permissions
)
select
  '00000000-0000-0000-0000-000000000001',
  au.id,
  lower(au.email),
  coalesce(au.raw_user_meta_data ->> 'full_name', 'Admin Demo'),
  'admin',
  'active',
  '{"viewTables":true,"createOrders":true,"confirmKitchen":true,"chargeOrders":true,"openShift":true,"closeShift":true,"viewOrders":true,"applyDiscounts":true,"cancelOrders":true,"removeOrderItems":true,"editAfterKitchen":true,"viewReports":true,"modifyMenu":true,"modifySettings":true}'::jsonb
from auth.users au
where au.email = lower('demo@pos.com')
on conflict (business_id, user_id) do update set
  role = 'admin',
  status = 'active',
  permissions = excluded.permissions,
  updated_at = now();
