CREATE OR REPLACE FUNCTION public.sync_membership_status_from_payments(p_membership_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tier text;
  v_complimentary boolean;
  v_fee numeric;
  v_sum numeric;
begin
  select tier, complimentary into v_tier, v_complimentary
  from public.memberships
  where id = p_membership_id;

  if not found then
    return;
  end if;

  if v_complimentary then
    return;
  end if;

  v_fee := public.membership_tier_fee_amount(v_tier);
  if v_fee is null then
    return;
  end if;

  select coalesce(sum(membership_amount), 0) into v_sum
  from public.payments
  where membership_id = p_membership_id;

  if v_sum >= v_fee then
    update public.memberships
    set status = 'active'
    where id = p_membership_id;
  else
    update public.memberships
    set status = 'pending'
    where id = p_membership_id;
  end if;
end;
$function$;

revoke all on function public.sync_membership_status_from_payments(p_membership_id uuid) from public;
grant execute on function public.sync_membership_status_from_payments(p_membership_id uuid) to service_role;
comment on function public.sync_membership_status_from_payments(p_membership_id uuid) is
  'Set membership active if sum(membership_amount) >= tier fee, else pending; no-op for complimentary memberships. service_role only.';
