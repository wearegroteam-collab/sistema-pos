alter type public.table_status add value if not exists 'bloqueada';

alter table public.restaurant_tables
  add column if not exists x numeric(10, 2) not null default 40,
  add column if not exists y numeric(10, 2) not null default 40,
  add column if not exists width numeric(10, 2) not null default 110,
  add column if not exists height numeric(10, 2) not null default 90,
  add column if not exists shape text not null default 'rectangle',
  add column if not exists zone text not null default 'Salon';

alter table public.restaurant_tables
  drop constraint if exists restaurant_tables_shape_check;

alter table public.restaurant_tables
  add constraint restaurant_tables_shape_check
  check (shape in ('square', 'rectangle', 'circle'));

alter table public.settings
  add column if not exists kitchen_ticket_settings jsonb not null default '{}'::jsonb;
