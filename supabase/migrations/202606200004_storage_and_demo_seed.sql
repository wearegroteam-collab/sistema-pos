insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

drop policy if exists business_logos_public_read on storage.objects;
create policy business_logos_public_read on storage.objects
for select using (bucket_id = 'business-logos');

drop policy if exists business_logos_authenticated_upload on storage.objects;
create policy business_logos_authenticated_upload on storage.objects
for insert with check (bucket_id = 'business-logos' and auth.role() = 'authenticated');

insert into public.businesses (id, name, email, phone, status, demo, test_mode, currency, timezone)
values ('00000000-0000-0000-0000-000000000001', 'Demo Restaurante', 'admin@demo.com', '3000000000', 'active', true, true, 'COP', 'America/Bogota')
on conflict (id) do nothing;

insert into public.settings (business_id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (business_id) do nothing;

insert into public.categories (business_id, name, sort_order)
values
  ('00000000-0000-0000-0000-000000000001', 'Burgers', 1),
  ('00000000-0000-0000-0000-000000000001', 'Bebidas', 2)
on conflict do nothing;

insert into public.restaurant_tables (business_id, name, sort_order)
values
  ('00000000-0000-0000-0000-000000000001', 'Mesa 1', 1),
  ('00000000-0000-0000-0000-000000000001', 'Mesa 2', 2),
  ('00000000-0000-0000-0000-000000000001', 'Barra', 3)
on conflict do nothing;
