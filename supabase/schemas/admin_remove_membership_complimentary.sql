CREATE OR REPLACE FUNCTION public.admin_remove_membership_complimentary(p_membership_id uuid)
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

  if not m.complimentary then
    return jsonb_build_object('ok', false, 'error', 'not_complimentary');
  end if;

  update public.memberships
  set status = 'pending', complimentary = false
  where id = p_membership_id;

  perform public.sync_membership_status_from_payments(p_membership_id);

  return jsonb_build_object('ok', true, 'membership_id', p_membership_id);
end;
$function$;

revoke all on function public.admin_remove_membership_complimentary(p_membership_id uuid) from public;
grant execute on function public.admin_remove_membership_complimentary(p_membership_id uuid) to service_role;
comment on function public.admin_remove_membership_complimentary(p_membership_id uuid) is
  'Clear the complimentary flag on a membership, reverting it to pending and re-syncing status from any recorded payments. service_role only.';
