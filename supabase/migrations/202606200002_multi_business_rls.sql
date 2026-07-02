create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.business_users bu
    where bu.user_id = auth.uid()
      and bu.role = 'super_admin'
      and bu.status = 'active'
  );
$$;

create or replace function public.can_access_business(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.business_users bu
      where bu.user_id = auth.uid()
        and bu.business_id = target_business_id
        and bu.status = 'active'
    );
$$;

create or replace function public.is_business_admin(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.business_users bu
      where bu.user_id = auth.uid()
        and bu.business_id = target_business_id
        and bu.role = 'admin'
        and bu.status = 'active'
    );
$$;

alter table public.businesses enable row level security;
alter table public.business_users enable row level security;
alter table public.invitations enable row level security;
alter table public.settings enable row level security;
alter table public.payment_methods enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.extras enable row level security;
alter table public.product_extras enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_extras enable row level security;
alter table public.payments enable row level security;
alter table public.shifts enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists businesses_access on public.businesses;
create policy businesses_access on public.businesses
for all using (public.is_super_admin() or public.can_access_business(id))
with check (public.is_super_admin() or public.can_access_business(id));

drop policy if exists business_users_access on public.business_users;
create policy business_users_access on public.business_users
for select using (public.is_super_admin() or user_id = auth.uid() or public.is_business_admin(business_id));

drop policy if exists business_users_manage on public.business_users;
create policy business_users_manage on public.business_users
for insert with check (public.is_business_admin(business_id));

drop policy if exists business_users_update on public.business_users;
create policy business_users_update on public.business_users
for update using (public.is_business_admin(business_id))
with check (public.is_business_admin(business_id));

drop policy if exists invitations_access on public.invitations;
create policy invitations_access on public.invitations
for all using (public.is_business_admin(business_id))
with check (public.is_business_admin(business_id));

drop policy if exists settings_access on public.settings;
create policy settings_access on public.settings
for all using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists payment_methods_access on public.payment_methods;
create policy payment_methods_access on public.payment_methods
for all using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists categories_access on public.categories;
create policy categories_access on public.categories
for all using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists products_access on public.products;
create policy products_access on public.products
for all using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists extras_access on public.extras;
create policy extras_access on public.extras
for all using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists product_extras_access on public.product_extras;
create policy product_extras_access on public.product_extras
for all using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists restaurant_tables_access on public.restaurant_tables;
create policy restaurant_tables_access on public.restaurant_tables
for all using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists orders_access on public.orders;
create policy orders_access on public.orders
for all using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists order_items_access on public.order_items;
create policy order_items_access on public.order_items
for all using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists order_item_extras_access on public.order_item_extras;
create policy order_item_extras_access on public.order_item_extras
for all using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists payments_access on public.payments;
create policy payments_access on public.payments
for all using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists shifts_access on public.shifts;
create policy shifts_access on public.shifts
for all using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists audit_logs_access on public.audit_logs;
create policy audit_logs_access on public.audit_logs
for all using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));
