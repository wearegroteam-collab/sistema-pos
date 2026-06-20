alter table public.businesses
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_skipped boolean not null default false;

update public.businesses
set onboarding_completed = true
where demo = true
  and onboarding_completed = false
  and onboarding_skipped = false;
