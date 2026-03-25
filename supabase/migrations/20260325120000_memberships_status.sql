-- pending: user started checkout / awaiting payment; active: confirmed (Stripe webhook or admin payment).
alter table public.memberships
  add column if not exists status text not null default 'active';

alter table public.memberships
  drop constraint if exists memberships_status_check;

alter table public.memberships
  add constraint memberships_status_check check (status in ('pending', 'active'));

create unique index if not exists memberships_member_id_year_key
  on public.memberships (member_id, year);

-- Members may create only pending rows for themselves; delete only their own pending rows.
drop policy if exists "memberships_insert_own_pending" on public.memberships;
drop policy if exists "memberships_delete_own_pending" on public.memberships;

create policy "memberships_insert_own_pending"
on public.memberships
for insert
to authenticated
with check (
  status = 'pending'
  and year = extract(year from (now() at time zone 'America/Toronto'))::smallint
  and exists (
    select 1
    from public.members m
    where m.id = memberships.member_id
      and (
        (m.primary_email is not null
          and lower(trim(m.primary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))))
        or
        (m.secondary_email is not null
          and lower(trim(m.secondary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))))
      )
  )
);

create policy "memberships_delete_own_pending"
on public.memberships
for delete
to authenticated
using (
  status = 'pending'
  and exists (
    select 1
    from public.members m
    where m.id = memberships.member_id
      and (
        (m.primary_email is not null
          and lower(trim(m.primary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))))
        or
        (m.secondary_email is not null
          and lower(trim(m.secondary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))))
      )
  )
);
