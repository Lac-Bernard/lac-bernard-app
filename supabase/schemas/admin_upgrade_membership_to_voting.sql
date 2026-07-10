CREATE OR REPLACE FUNCTION public.admin_upgrade_membership_to_voting(p_membership_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  m public.memberships%rowtype;
  v_elig jsonb;
begin
  select * into m
  from public.memberships
  where id = p_membership_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if m.tier is distinct from 'associate' then
    return jsonb_build_object('ok', false, 'error', 'not_associate');
  end if;

  v_elig := public.admin_membership_voting_eligible(m.member_id, m.year);
  if coalesce(v_elig->>'ok', '') <> 'true' then
    return jsonb_build_object('ok', false, 'error', coalesce(v_elig->>'error', 'eligibility_failed'));
  end if;

  if m.complimentary then
    update public.memberships
    set tier = 'voting', complimentary = false, status = 'pending'
    where id = p_membership_id;
  else
    update public.memberships
    set tier = 'voting'
    where id = p_membership_id;
  end if;

  perform public.sync_membership_status_from_payments(p_membership_id);

  return jsonb_build_object('ok', true, 'membership_id', p_membership_id);
end;
$function$;

revoke all on function public.admin_upgrade_membership_to_voting(p_membership_id uuid) from public;
grant execute on function public.admin_upgrade_membership_to_voting(p_membership_id uuid) to service_role;
comment on function public.admin_upgrade_membership_to_voting(p_membership_id uuid) is
  'Set membership tier from associate to voting; complimentary rows clear flag and become pending until voting dues paid. service_role only.';
