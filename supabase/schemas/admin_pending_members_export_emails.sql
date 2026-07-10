CREATE OR REPLACE FUNCTION public.admin_pending_members_export_emails()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r text;
begin
  select string_agg(x.pe, ',' order by x.pe)
  into r
  from (
    select min(trim(m.primary_email)) as pe
    from public.memberships ms
    join public.members m on m.id = ms.member_id
    where ms.status = 'pending'
      and m.status is distinct from 'disabled'
      and m.primary_email is not null
      and length(trim(m.primary_email)) > 0
    group by lower(trim(m.primary_email))
  ) x;

  return coalesce(r, '');
end;
$function$;

revoke all on function public.admin_pending_members_export_emails() from public;
grant execute on function public.admin_pending_members_export_emails() to anon, authenticated, service_role;
comment on function public.admin_pending_members_export_emails() is
  'Comma-separated primary emails for pending memberships; requires non-empty primary email. service_role only.';
