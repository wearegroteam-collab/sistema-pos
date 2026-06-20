create extension if not exists "uuid-ossp";

insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

create type app_role as enum ('super_admin', 'admin', 'cajero');
create type user_status as enum ('active', 'inactive');
create type business_status as enum ('active', 'inactive');
create type invitation_status as enum ('pending', 'accepted', 'expired');
create type table_status as enum ('libre', 'ocupada', 'esperando_pago');
create type order_type as enum ('mesa', 'pickup', 'delivery');
create type order_status as enum ('abierta', 'en_cocina', 'pagada', 'cancelada', 'anulada');
create type payment_method as enum ('efectivo', 'tarjeta', 'transferencia', 'ATH', 'Zelle', 'otro');

create table businesses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  commercial_name text,
  logo_url text,
  address text,
  phone text,
  email text,
  nit text,
  status business_status not null default 'active',
  test_mode boolean not null default true,
  demo boolean not null default false,
  currency text not null default 'COP',
  timezone text not null default 'America/Bogota',
  created_at timestamptz not null default now()
);

create table app_settings (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null unique references businesses(id) on delete cascade,
  receipt_settings jsonb not null default '{}',
  kitchen_settings jsonb not null default '{}',
  cashier_permissions jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payment_methods (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  method payment_method not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table cash_shifts (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  opened_by uuid references auth.users(id) on delete set null,
  opened_by_name text not null,
  closed_by uuid references auth.users(id) on delete set null,
  closed_by_name text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_amount numeric(10, 2) not null default 0,
  opening_note text,
  status text not null default 'abierto' check (status in ('abierto', 'cerrado')),
  test_mode boolean not null default false,
  expected_totals jsonb,
  counted_totals jsonb,
  difference numeric(10, 2),
  closing_note text
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

create table business_users (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role app_role not null default 'cajero',
  status user_status not null default 'active',
  permissions jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table invitations (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  email text not null,
  role app_role not null,
  permissions jsonb not null default '{}',
  status invitation_status not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid not null references categories(id) on delete restrict,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table restaurant_tables (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  status table_status not null default 'libre',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table additions (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table product_additions (
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  addition_id uuid not null references additions(id) on delete cascade,
  primary key (product_id, addition_id)
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  order_number bigint generated by default as identity,
  type order_type not null,
  table_id uuid references restaurant_tables(id) on delete set null,
  table_name text,
  status order_status not null default 'abierta',
  subtotal numeric(10, 2) not null default 0,
  tip numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  created_by uuid references users(id) on delete set null,
  cashier_name text,
  shift_id uuid references cash_shifts(id) on delete set null,
  test_mode boolean not null default false,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0),
  notes text,
  test_mode boolean not null default false,
  created_at timestamptz not null default now()
);

create table order_item_additions (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  order_item_id uuid not null references order_items(id) on delete cascade,
  addition_id uuid references additions(id) on delete set null,
  addition_name text not null,
  price numeric(10, 2) not null check (price >= 0),
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  method payment_method not null,
  amount numeric(10, 2) not null check (amount >= 0),
  test_mode boolean not null default false,
  paid_at timestamptz not null default now()
);

create table order_audit_events (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  user_name text not null,
  action text not null,
  reason text,
  test_mode boolean not null default false,
  created_at timestamptz not null default now()
);

alter table businesses enable row level security;
alter table app_settings enable row level security;
alter table payment_methods enable row level security;
alter table cash_shifts enable row level security;
alter table users enable row level security;
alter table business_users enable row level security;
alter table invitations enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table restaurant_tables enable row level security;
alter table additions enable row level security;
alter table product_additions enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_item_additions enable row level security;
alter table payments enable row level security;
alter table order_audit_events enable row level security;

create policy "Users can read their business"
on users for select
using (id = auth.uid());

create policy "Users can read business memberships"
on business_users for select
using (
  user_id = auth.uid()
  or exists (select 1 from business_users bu where bu.user_id = auth.uid() and bu.role = 'super_admin')
  or exists (select 1 from business_users bu where bu.user_id = auth.uid() and bu.business_id = business_users.business_id and bu.role = 'admin')
);

create policy "Admins can manage business memberships"
on business_users for all
using (
  exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or (bu.business_id = business_users.business_id and bu.role = 'admin')))
)
with check (
  exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or (bu.business_id = business_users.business_id and bu.role = 'admin')))
);

create policy "Admins can manage invitations"
on invitations for all
using (
  exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or (bu.business_id = invitations.business_id and bu.role = 'admin')))
)
with check (
  exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or (bu.business_id = invitations.business_id and bu.role = 'admin')))
);

create policy "Authenticated users can manage business data"
on businesses for all
using (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = businesses.id)))
with check (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = businesses.id)));

create policy "Authenticated users can manage app settings"
on app_settings for all
using (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = app_settings.business_id)))
with check (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = app_settings.business_id)));

create policy "Authenticated users can manage payment methods"
on payment_methods for all
using (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = payment_methods.business_id)))
with check (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = payment_methods.business_id)));

create policy "Authenticated users can manage cash shifts"
on cash_shifts for all
using (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = cash_shifts.business_id)))
with check (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = cash_shifts.business_id)));

create policy "Authenticated users can manage categories"
on categories for all
using (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = categories.business_id)))
with check (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = categories.business_id)));

create policy "Authenticated users can manage products"
on products for all
using (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = products.business_id)))
with check (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = products.business_id)));

create policy "Authenticated users can manage tables"
on restaurant_tables for all
using (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = restaurant_tables.business_id)))
with check (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = restaurant_tables.business_id)));

create policy "Authenticated users can manage additions"
on additions for all
using (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = additions.business_id)))
with check (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = additions.business_id)));

create policy "Authenticated users can manage product additions"
on product_additions for all
using (
  exists (
    select 1
    from products
    join business_users bu on bu.business_id = products.business_id
    where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = products.business_id) and products.id = product_additions.product_id
  )
)
with check (
  exists (
    select 1
    from products
    join business_users bu on bu.business_id = products.business_id
    where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = products.business_id) and products.id = product_additions.product_id
  )
);

create policy "Authenticated users can manage orders"
on orders for all
using (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = orders.business_id)))
with check (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = orders.business_id)));

create policy "Authenticated users can manage payments"
on payments for all
using (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = payments.business_id)))
with check (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = payments.business_id)));

create policy "Authenticated users can manage order items"
on order_items for all
using (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = order_items.business_id)))
with check (exists (select 1 from business_users bu where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = order_items.business_id)));

create policy "Authenticated users can manage order item additions"
on order_item_additions for all
using (
  exists (
    select 1
    from order_items
    join orders on orders.id = order_items.order_id
    join business_users bu on bu.business_id = orders.business_id
    where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = orders.business_id) and order_items.id = order_item_additions.order_item_id
  )
)
with check (
  exists (
    select 1
    from order_items
    join orders on orders.id = order_items.order_id
    join business_users bu on bu.business_id = orders.business_id
    where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = orders.business_id) and order_items.id = order_item_additions.order_item_id
  )
);

create policy "Authenticated users can read order audit"
on order_audit_events for select
using (
  exists (
    select 1
    from orders
    join business_users bu on bu.business_id = orders.business_id
    where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = orders.business_id) and orders.id = order_audit_events.order_id
  )
);

create policy "Authenticated users can insert order audit"
on order_audit_events for insert
with check (
  exists (
    select 1
    from orders
    join business_users bu on bu.business_id = orders.business_id
    where bu.user_id = auth.uid() and (bu.role = 'super_admin' or bu.business_id = orders.business_id) and orders.id = order_audit_events.order_id
  )
);
