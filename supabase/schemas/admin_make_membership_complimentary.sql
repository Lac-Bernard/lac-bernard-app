CREATE OR REPLACE FUNCTION public.admin_make_membership_complimentary(p_membership_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  m public.memberships%rowtype;
begin
  select * into m
  from public.memberships
  where id = p_membership_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if m.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  update public.memberships
  set status = 'active', complimentary = true
  where id = p_membership_id;

  return jsonb_build_object('ok', true, 'membership_id', p_membership_id);
end;
$function$;

revoke all on function public.admin_make_membership_complimentary(p_membership_id uuid) from public;
grant execute on function public.admin_make_membership_complimentary(p_membership_id uuid) to service_role;
comment on function public.admin_make_membership_complimentary(p_membership_id uuid) is
  'Mark a pending membership as complimentary (no payment required) and activate it. service_role only.';
