-- When a membership becomes active, record activation time (live flows: now(); import can set explicitly).
alter table public.memberships
  add column if not exists activated_at timestamptz;

comment on column public.memberships.activated_at is
  'First transition to active (or legacy/import synthetic time). Cleared when status leaves active.';

update public.memberships
set activated_at = created_at
where status = 'active'
  and activated_at is null;

create or replace function public.memberships_sync_activated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'active' then
      new.activated_at := coalesce(new.activated_at, now());
    else
      new.activated_at := null;
    end if;
    return new;
  end if;

  if new.status = 'active' and old.status is distinct from 'active' then
    new.activated_at := coalesce(new.activated_at, now());
  elsif new.status is distinct from 'active' then
    new.activated_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists memberships_sync_activated_at on public.memberships;

create trigger memberships_sync_activated_at
  before insert or update of status, activated_at
  on public.memberships
  for each row
  execute function public.memberships_sync_activated_at();

