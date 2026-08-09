CREATE OR REPLACE FUNCTION public.record_manual_payment(p_membership_id uuid, p_amount numeric, p_membership_amount numeric, p_donation_amount numeric, p_method text, p_payment_date date, p_notes text, p_donation_note text, p_donation_category text DEFAULT NULL::text, p_reference text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  m public.memberships%rowtype;
  new_payment_id bigint;
  v_fee numeric;
  v_paid numeric;
  v_round_total numeric;
  v_ref text;
  v_category text;
begin
  if p_method is null or p_method not in ('e-transfer', 'cheque', 'cash', 'unknown') then
    return jsonb_build_object('ok', false, 'error', 'invalid_method');
  end if;

  if p_amount is null or p_amount < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_amount');
  end if;

  if p_membership_amount is null or p_membership_amount < 0 or p_donation_amount is null or p_donation_amount < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_split');
  end if;

  v_round_total := round((p_membership_amount + p_donation_amount)::numeric, 2);
  if round(p_amount::numeric, 2) <> v_round_total then
    return jsonb_build_object('ok', false, 'error', 'amount_split_mismatch');
  end if;

  v_ref := nullif(left(trim(coalesce(p_reference, '')), 512), '');

  v_category := nullif(lower(trim(coalesce(p_donation_category, ''))), '');
  if p_donation_amount > 0 then
    if v_category is null or v_category not in ('environment', 'regatta', 'general') then
      return jsonb_build_object('ok', false, 'error', 'invalid_donation_category');
    end if;
  else
    v_category := null;
  end if;

  select * into m
  from public.memberships
  where id = p_membership_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_fee := public.membership_tier_fee_amount(m.tier);
  if v_fee is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_tier');
  end if;

  select coalesce(sum(membership_amount), 0) into v_paid
  from public.payments
  where membership_id = p_membership_id;

  if p_membership_amount > 0 then
    -- Complimentary memberships have their dues waived, so a dues portion is never valid.
    -- Donations are still allowed (handled in the else branch below).
    if m.complimentary then
      return jsonb_build_object('ok', false, 'error', 'complimentary_membership');
    end if;
    if m.status is distinct from 'pending' then
      return jsonb_build_object('ok', false, 'error', 'dues_only_when_pending');
    end if;
    if round((v_paid + p_membership_amount)::numeric, 2) > round(v_fee::numeric, 2) then
      return jsonb_build_object('ok', false, 'error', 'membership_overpay');
    end if;
  else
    if p_donation_amount <= 0 then
      return jsonb_build_object('ok', false, 'error', 'invalid_split');
    end if;
    -- Donations require dues to be settled first, except on complimentary memberships
    -- where dues are waived (so a donation can be recorded even with no dues paid).
    if not m.complimentary and round(v_paid::numeric, 2) < round(v_fee::numeric, 2) then
      return jsonb_build_object('ok', false, 'error', 'dues_unpaid');
    end if;
  end if;

  insert into public.payments (
    membership_id,
    method,
    amount,
    date,
    notes,
    payment_id,
    membership_amount,
    donation_amount,
    donation_note,
    donation_category
  )
  values (
    p_membership_id,
    p_method,
    p_amount,
    coalesce(p_payment_date, (now() at time zone 'America/Toronto')::date),
    nullif(trim(p_notes), ''),
    v_ref,
    p_membership_amount,
    p_donation_amount,
    nullif(trim(p_donation_note), ''),
    v_category
  )
  returning id into new_payment_id;

  perform public.sync_membership_status_from_payments(p_membership_id);

  return jsonb_build_object(
    'ok', true,
    'payment_id', new_payment_id,
    'membership_id', p_membership_id
  );
end;
$function$;

revoke all on function public.record_manual_payment(p_membership_id uuid, p_amount numeric, p_membership_amount numeric, p_donation_amount numeric, p_method text, p_payment_date date, p_notes text, p_donation_note text, p_donation_category text, p_reference text) from public;
revoke execute on function public.record_manual_payment(p_membership_id uuid, p_amount numeric, p_membership_amount numeric, p_donation_amount numeric, p_method text, p_payment_date date, p_notes text, p_donation_note text, p_donation_category text, p_reference text) from anon, authenticated;
grant execute on function public.record_manual_payment(p_membership_id uuid, p_amount numeric, p_membership_amount numeric, p_donation_amount numeric, p_method text, p_payment_date date, p_notes text, p_donation_note text, p_donation_category text, p_reference text) to service_role;
comment on function public.record_manual_payment(p_membership_id uuid, p_amount numeric, p_membership_amount numeric, p_donation_amount numeric, p_method text, p_payment_date date, p_notes text, p_donation_note text, p_donation_category text, p_reference text) is
  'Insert manual payment with dues/donation split and optional donation_category; allows donations on complimentary memberships but rejects any dues portion (dues are waived). service_role only.';
