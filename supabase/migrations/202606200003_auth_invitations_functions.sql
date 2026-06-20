create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare
  table_name text;
begin
  foreach table_name in array array[
    'businesses',
    'business_users',
    'invitations',
    'settings',
    'categories',
    'products',
    'extras',
    'restaurant_tables',
    'orders',
    'order_items',
    'shifts'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.create_business_with_admin_invitation(
  business_name text,
  admin_email text,
  phone text default null,
  is_demo boolean default false
)
returns table (business_id uuid, invitation_id uuid, invitation_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
  new_invitation_id uuid;
  new_token text;
begin
  if not public.is_super_admin() then
    raise exception 'Only super_admin can create businesses';
  end if;

  insert into public.businesses (name, email, phone, status, demo, test_mode)
  values (business_name, admin_email, phone, 'active', is_demo, true)
  returning id into new_business_id;

  insert into public.settings (business_id)
  values (new_business_id);

  insert into public.invitations (business_id, email, role, permissions, invited_by)
  values (new_business_id, lower(admin_email), 'admin', '{"viewTables":true,"createOrders":true,"confirmKitchen":true,"chargeOrders":true,"openShift":true,"closeShift":true,"viewOrders":true,"applyDiscounts":true,"cancelOrders":true,"removeOrderItems":true,"editAfterKitchen":true,"viewReports":true,"modifyMenu":true,"modifySettings":true}'::jsonb, auth.uid())
  returning id, token into new_invitation_id, new_token;

  return query select new_business_id, new_invitation_id, new_token;
end;
$$;

create or replace function public.accept_invitation(invitation_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations%rowtype;
  membership_id uuid;
begin
  select *
  into inv
  from public.invitations
  where token = invitation_token
    and status = 'pending'
    and expires_at > now();

  if inv.id is null then
    raise exception 'Invitation is invalid or expired';
  end if;

  insert into public.business_users (business_id, user_id, email, full_name, role, status, permissions)
  values (inv.business_id, auth.uid(), inv.email, coalesce((auth.jwt() ->> 'email'), inv.email), inv.role, 'active', inv.permissions)
  on conflict (business_id, user_id)
  do update set status = 'active', role = excluded.role, permissions = excluded.permissions
  returning id into membership_id;

  update public.invitations
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now(), updated_at = now()
  where id = inv.id;

  return membership_id;
end;
$$;

create or replace function public.resend_invitation(invitation_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations%rowtype;
  new_token text;
begin
  select * into inv from public.invitations where id = invitation_id;
  if inv.id is null or not public.is_business_admin(inv.business_id) then
    raise exception 'Not allowed';
  end if;

  new_token := encode(gen_random_bytes(32), 'hex');
  update public.invitations
  set token = new_token, status = 'pending', expires_at = now() + interval '7 days', updated_at = now()
  where id = invitation_id;

  return new_token;
end;
$$;

create or replace function public.clear_test_data(target_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_business_admin(target_business_id) then
    raise exception 'Not allowed';
  end if;

  delete from public.audit_logs where business_id = target_business_id and test_mode = true;
  delete from public.payments where business_id = target_business_id and test_mode = true;
  delete from public.order_item_extras where business_id = target_business_id and test_mode = true;
  delete from public.order_items where business_id = target_business_id and test_mode = true;
  delete from public.orders where business_id = target_business_id and test_mode = true;
  delete from public.shifts where business_id = target_business_id and test_mode = true;
end;
$$;
