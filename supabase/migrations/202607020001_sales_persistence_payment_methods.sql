create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

alter table public.payment_methods enable row level security;

drop policy if exists payment_methods_access on public.payment_methods;
create policy payment_methods_access on public.payment_methods
for all using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

alter table public.payments
  add column if not exists payment_method_id uuid references public.payment_methods(id) on delete set null,
  add column if not exists payment_method_name text;

create index if not exists idx_payments_payment_method_id on public.payments(payment_method_id);
create index if not exists idx_payments_paid_at on public.payments(paid_at);
create index if not exists idx_orders_closed_at on public.orders(closed_at);

insert into public.payment_methods (business_id, name, active)
select b.id, method.name, true
from public.businesses b
cross join (values
  ('Efectivo'),
  ('Tarjeta'),
  ('Transferencia'),
  ('ATH'),
  ('Zelle'),
  ('Otro')
) as method(name)
on conflict (business_id, name) do nothing;

update public.payments p
set payment_method_name = case p.method
  when 'efectivo' then 'Efectivo'
  when 'tarjeta' then 'Tarjeta'
  when 'transferencia' then 'Transferencia'
  when 'ATH' then 'ATH'
  when 'Zelle' then 'Zelle'
  else 'Otro'
end
where p.payment_method_name is null;

update public.payments p
set payment_method_id = pm.id
from public.payment_methods pm
where pm.business_id = p.business_id
  and lower(pm.name) = lower(p.payment_method_name)
  and p.payment_method_id is null;
