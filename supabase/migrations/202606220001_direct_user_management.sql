alter table public.business_users
  add column if not exists force_password_change boolean not null default false;

do $$
begin
  alter type public.app_role add value if not exists 'supervisor';
exception when duplicate_object then null;
end $$;

create index if not exists idx_business_users_force_password_change
  on public.business_users(force_password_change);
