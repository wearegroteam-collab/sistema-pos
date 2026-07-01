alter table public.shifts
  drop constraint if exists shifts_status_check;

update public.shifts
set status = case status
  when 'abierto' then 'open'
  when 'cerrado' then 'closed'
  else status
end
where status in ('abierto', 'cerrado');

alter table public.shifts
  add constraint shifts_status_check check (status in ('open', 'closed'));

create unique index if not exists shifts_one_open_per_business
on public.shifts (business_id)
where status = 'open';
