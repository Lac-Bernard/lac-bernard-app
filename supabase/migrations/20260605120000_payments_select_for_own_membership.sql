-- Allow signed-in users to read payments only for their own memberships (same email rule as memberships).
create policy "payments_select_for_own_membership"
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships ms
    join public.members m on m.id = ms.member_id
    where ms.id = payments.membership_id
      and (
        (m.primary_email is not null
          and lower(trim(m.primary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))))
        or
        (m.secondary_email is not null
          and lower(trim(m.secondary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))))
      )
  )
);

comment on policy "payments_select_for_own_membership" on public.payments is
  'Member portal: read-only access to payment rows linked to memberships owned by the signed-in user.';
