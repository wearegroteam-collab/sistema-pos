# Super Admin en Supabase

El Super Admin no se muestra en el login publico. Debe entrar por la ruta directa `/super-admin` usando un usuario real de Supabase Auth.

1. Crea el usuario desde Supabase Dashboard > Authentication > Users.
2. Copia el email del usuario.
3. Ejecuta este SQL en Supabase SQL Editor, cambiando el correo:

```sql
do $$
declare
  target_user auth.users%rowtype;
begin
  select *
  into target_user
  from auth.users
  where email = lower('superadmin@tudominio.com');

  if target_user.id is null then
    raise exception 'No existe un usuario Auth con ese correo';
  end if;

  if not exists (
    select 1
    from public.business_users
    where user_id = target_user.id
      and role = 'super_admin'
      and status = 'active'
  ) then
    insert into public.business_users (
      business_id,
      user_id,
      email,
      full_name,
      role,
      status,
      permissions
    )
    values (
      null,
      target_user.id,
      lower(target_user.email),
      coalesce(target_user.raw_user_meta_data ->> 'full_name', target_user.email),
      'super_admin',
      'active',
      '{}'::jsonb
    );
  end if;
end $$;
```

Luego entra desde `/super-admin`.
