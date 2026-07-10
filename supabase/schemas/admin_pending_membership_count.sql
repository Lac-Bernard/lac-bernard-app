CREATE OR REPLACE FUNCTION public.admin_pending_membership_count(p_year smallint)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*)::int
  from public.members m
  where m.status::text <> 'disabled'
    and exists (
      select 1 from public.memberships ms
      where ms.member_id = m.id and ms.year = p_year
        and ms.status = 'pending'
    );
$function$;

revoke all on function public.admin_pending_membership_count(p_year smallint) from public;
grant execute on function public.admin_pending_membership_count(p_year smallint) to anon, authenticated, service_role;
comment on function public.admin_pending_membership_count(p_year smallint) is
  'Count of non-disabled members with a pending membership for p_year. Same rule as pending_f in admin_member_index — use for tab badge and activity KPI so counts cannot drift from directory pills.';
