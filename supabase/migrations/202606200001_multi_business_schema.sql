create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('super_admin', 'admin', 'cashier');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.record_status as enum ('active', 'inactive', 'deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.table_status as enum ('libre', 'ocupada', 'esperando_pago');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_type as enum ('mesa', 'pickup', 'delivery');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('abierta', 'en_cocina', 'pagada', 'cancelada', 'anulada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('efectivo', 'tarjeta', 'transferencia', 'ATH', 'Zelle', 'otro');
exception when duplicate_object then null; end $$;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  nit text,
  logo_url text,
  address text,
  status public.record_status not null default 'active',
  demo boolean not null default false,
  test_mode boolean not null default true,
  onboarding_completed boolean not null default false,
  onboarding_skipped boolean not null default false,
  currency text not null default 'COP' check (currency = 'COP'),
  timezone text not null default 'America/Bogota' check (timezone = 'America/Bogota'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null,
  status public.record_status not null default 'active',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, email),
  unique (business_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  email text not null,
  role public.app_role not null,
  permissions jsonb not null default '{}'::jsonb,
  status public.invitation_status not null default 'pending',
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  receipt_settings jsonb not null default '{}'::jsonb,
  kitchen_settings jsonb not null default '{}'::jsonb,
  checkout_settings jsonb not null default '{}'::jsonb,
  printing_settings jsonb not null default '{}'::jsonb,
  payment_methods jsonb not null default '[]'::jsonb,
  cashier_permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.extras (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_extras (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  extra_id uuid not null references public.extras(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (product_id, extra_id)
);

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  status public.table_status not null default 'libre',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  opened_by uuid references auth.users(id) on delete set null,
  opened_by_name text not null,
  closed_by uuid references auth.users(id) on delete set null,
  closed_by_name text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_amount numeric(12, 2) not null default 0,
  opening_note text,
  status text not null default 'abierto' check (status in ('abierto', 'cerrado')),
  expected_totals jsonb,
  counted_totals jsonb,
  difference numeric(12, 2),
  closing_note text,
  test_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  shift_id uuid references public.shifts(id) on delete set null,
  order_number bigint generated by default as identity,
  type public.order_type not null,
  table_id uuid references public.restaurant_tables(id) on delete set null,
  table_name text,
  status public.order_status not null default 'abierta',
  subtotal numeric(12, 2) not null default 0,
  tip numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  cashier_id uuid references auth.users(id) on delete set null,
  cashier_name text,
  test_mode boolean not null default false,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  notes text,
  test_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_item_extras (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  extra_id uuid references public.extras(id) on delete set null,
  extra_name text not null,
  price numeric(12, 2) not null check (price >= 0),
  test_mode boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  shift_id uuid references public.shifts(id) on delete set null,
  method public.payment_method not null,
  amount numeric(12, 2) not null check (amount >= 0),
  test_mode boolean not null default false,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_name text not null,
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  test_mode boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_business_users_user_id on public.business_users(user_id);
create index if not exists idx_business_users_business_id on public.business_users(business_id);
create index if not exists idx_invitations_email on public.invitations(email);
create index if not exists idx_orders_business_id on public.orders(business_id);
create index if not exists idx_orders_test_mode on public.orders(test_mode);
create index if not exists idx_orders_created_at on public.orders(created_at);
create index if not exists idx_payments_business_id on public.payments(business_id);
create index if not exists idx_shifts_business_id on public.shifts(business_id);
