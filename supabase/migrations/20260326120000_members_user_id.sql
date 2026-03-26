-- Link portal accounts to auth.users; nullable for members without a login yet.
alter table public.members
  add column if not exists user_id uuid references auth.users (id) on delete set null;

comment on column public.members.user_id is 'Supabase Auth user id for this member row; null if not linked.';

create unique index if not exists members_user_id_key
  on public.members (user_id)
  where user_id is not null;

-- Select: own row if linked by user_id, or legacy match on primary/secondary email.
drop policy if exists "members_select_own_by_email" on public.members;

create policy "members_select_own_by_email"
on public.members
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    primary_email is not null
    and lower(trim(primary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
  )
  or (
    secondary_email is not null
    and lower(trim(secondary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
  )
);

-- Memberships: same ownership rules via member row.
drop policy if exists "memberships_select_for_own_member" on public.memberships;

create policy "memberships_select_for_own_member"
on public.memberships
for select
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.id = memberships.member_id
      and (
        m.user_id = auth.uid()
        or (
          m.primary_email is not null
          and lower(trim(m.primary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
        )
        or (
          m.secondary_email is not null
          and lower(trim(m.secondary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
        )
      )
  )
);

drop policy if exists "memberships_insert_own_pending" on public.memberships;

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
        m.user_id = auth.uid()
        or (
          m.primary_email is not null
          and lower(trim(m.primary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
        )
        or (
          m.secondary_email is not null
          and lower(trim(m.secondary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
        )
      )
  )
);

drop policy if exists "memberships_delete_own_pending" on public.memberships;

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
        m.user_id = auth.uid()
        or (
          m.primary_email is not null
          and lower(trim(m.primary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
        )
        or (
          m.secondary_email is not null
          and lower(trim(m.secondary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
        )
      )
  )
);
