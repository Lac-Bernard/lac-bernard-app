CREATE OR REPLACE FUNCTION public.admin_daily_membership_summary()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with toronto_today as (
    select (now() at time zone 'America/Toronto')::date as d
  ),
  toronto_yesterday as (
    select (d - 1)::date as d from toronto_today
  )
  select jsonb_build_object(
    'pending_memberships',
    (select count(*)::int from public.memberships where status = 'pending'),
    'member_records_created_previous_toronto_day',
    (
      select count(*)::int
      from public.members mb
      cross join toronto_yesterday y
      where (mb.created_at at time zone 'America/Toronto')::date = y.d
    ),
    'memberships_activated_previous_toronto_day',
    (
      select count(*)::int
      from public.memberships m
      cross join toronto_yesterday y
      where m.status = 'active'
        and m.activated_at is not null
        and (m.activated_at at time zone 'America/Toronto')::date = y.d
    ),
    'toronto_report_date',
    (select d::text from toronto_today),
    'toronto_previous_date_for_activations',
    (select d::text from toronto_yesterday)
  );
$function$;

revoke all on function public.admin_daily_membership_summary() from public;
grant execute on function public.admin_daily_membership_summary() to service_role;
comment on function public.admin_daily_membership_summary() is
  'Snapshot counts for daily membership admin email. service_role only.';
