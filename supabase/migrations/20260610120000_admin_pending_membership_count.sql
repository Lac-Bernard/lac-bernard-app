-- Pending count for admin tab badge / overview KPI: must match pending_f in public.admin_member_index (same year + non-disabled members only).

create or replace function public.admin_pending_membership_count(p_year smallint)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.members m
  where m.status::text <> 'disabled'
    and exists (
      select 1 from public.memberships ms
      where ms.member_id = m.id and ms.year = p_year
        and ms.status = 'pending'
    );
$$;

revoke all on function public.admin_pending_membership_count(smallint) from public;
grant execute on function public.admin_pending_membership_count(smallint) to service_role;

comment on function public.admin_pending_membership_count(smallint) is
  'Count of non-disabled members with a pending membership for p_year. Same rule as pending_f in admin_member_index — use for tab badge and activity KPI so counts cannot drift from directory pills.';
