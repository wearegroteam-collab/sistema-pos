alter table public.businesses
  add column if not exists commercial_name text,
  add column if not exists last_activity_at timestamptz;

update public.businesses
set commercial_name = name
where commercial_name is null;
