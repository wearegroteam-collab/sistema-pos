# Usuario Demo

El login publico no muestra credenciales demo ni las autocompleta. Para habilitar el usuario demo:

1. En Supabase Dashboard > Authentication > Users, crea el usuario:
   - Email: `demo@pos.com`
   - Password: `Demo123456`
   - Email confirmado: si

2. Ejecuta la migracion `202606200006_super_admin_improvements.sql`.

3. Si ya ejecutaste la migracion antes de crear el usuario Auth, corre este SQL:

```sql
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
```
