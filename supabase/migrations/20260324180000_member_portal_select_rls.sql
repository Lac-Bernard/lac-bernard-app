-- Allow signed-in users to read their own member row (match auth email to primary or secondary email).
create policy "members_select_own_by_email"
on public.members
for select
to authenticated
using (
  (primary_email is not null
    and lower(trim(primary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))))
  or
  (secondary_email is not null
    and lower(trim(secondary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))))
);

-- Membership rows for that member only.
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
        (m.primary_email is not null
          and lower(trim(m.primary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))))
        or
        (m.secondary_email is not null
          and lower(trim(m.secondary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))))
      )
  )
);
