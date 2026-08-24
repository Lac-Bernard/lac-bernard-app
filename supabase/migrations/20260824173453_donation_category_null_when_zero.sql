set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.record_manual_payment(p_membership_id uuid, p_amount numeric, p_membership_amount numeric, p_donation_amount numeric, p_method text, p_payment_date date, p_notes text, p_donation_note text, p_reference text DEFAULT NULL::text, p_donation_category text DEFAULT NULL::text)
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
begin
  if p_method is null or p_method not in ('e-transfer', 'cheque', 'cash', 'unknown') then
    return jsonb_build_object('ok', false, 'error', 'invalid_method');
  end if;

  if p_donation_category is not null and p_donation_category not in ('environment', 'regatta', 'general') then
    return jsonb_build_object('ok', false, 'error', 'invalid_donation_category');
  end if;

  if p_donation_amount is null or p_donation_amount = 0 then
    p_donation_category := null;
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
    p_donation_category
  )
  returning id into new_payment_id;

  perform public.sync_membership_status_from_payments(p_membership_id);

  return jsonb_build_object(
    'ok', true,
    'payment_id', new_payment_id,
    'membership_id', p_membership_id
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.record_stripe_payment(p_membership_id uuid, p_amount numeric, p_membership_amount numeric, p_donation_amount numeric, p_stripe_payment_id text, p_notes text, p_donation_note text, p_stripe_fee_cad numeric DEFAULT NULL::numeric, p_stripe_balance_transaction_id text DEFAULT NULL::text, p_donation_category text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  m public.memberships%rowtype;
  new_payment_id bigint;
  existing_id bigint;
  v_round_total numeric;
  v_txn text;
  v_fee numeric;
  v_paid numeric;
begin
  if p_stripe_payment_id is null or trim(p_stripe_payment_id) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_payment_id');
  end if;

  v_txn := nullif(trim(coalesce(p_stripe_balance_transaction_id, '')), '');

  if p_stripe_fee_cad is not null and p_stripe_fee_cad < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_stripe_fee');
  end if;

  if p_donation_category is not null and p_donation_category not in ('environment', 'regatta', 'general') then
    return jsonb_build_object('ok', false, 'error', 'invalid_donation_category');
  end if;

  if p_donation_amount is null or p_donation_amount = 0 then
    p_donation_category := null;
  end if;

  select id into existing_id
  from public.payments
  where method = 'stripe'
    and payment_id = p_stripe_payment_id
  limit 1;

  if existing_id is not null then
    update public.payments p
    set
      stripe_fee_cad = coalesce(p.stripe_fee_cad, p_stripe_fee_cad),
      stripe_balance_transaction_id = coalesce(p.stripe_balance_transaction_id, v_txn),
      donation_category = coalesce(p.donation_category, p_donation_category)
    where p.id = existing_id;

    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'payment_id', existing_id,
      'membership_id', p_membership_id
    );
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

  select * into m
  from public.memberships
  where id = p_membership_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- Record the payment regardless of membership status: a member's Stripe charge can
  -- land after the membership was made complimentary/active (they can't start a checkout
  -- on a non-pending membership, so a dues split here means dues were genuinely owed at
  -- checkout time). Idempotency + the overpay guard below still apply, and status sync
  -- ignores complimentary rows.
  v_fee := public.membership_tier_fee_amount(m.tier);
  if v_fee is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_tier');
  end if;

  select coalesce(sum(membership_amount), 0) into v_paid
  from public.payments
  where membership_id = p_membership_id;

  if p_membership_amount > 0 then
    if round((v_paid + p_membership_amount)::numeric, 2) > round(v_fee::numeric, 2) then
      return jsonb_build_object('ok', false, 'error', 'membership_overpay');
    end if;
  end if;

  begin
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
      stripe_fee_cad,
      stripe_balance_transaction_id,
      donation_category
    )
    values (
      p_membership_id,
      'stripe',
      p_amount,
      (now() at time zone 'America/Toronto')::date,
      nullif(trim(p_notes), ''),
      p_stripe_payment_id,
      p_membership_amount,
      p_donation_amount,
      nullif(trim(p_donation_note), ''),
      p_stripe_fee_cad,
      v_txn,
      p_donation_category
    )
    returning id into new_payment_id;
  exception
    when unique_violation then
      select id into existing_id
      from public.payments
      where method = 'stripe'
        and payment_id = p_stripe_payment_id
      limit 1;
      if existing_id is not null then
        update public.payments p
        set
          stripe_fee_cad = coalesce(p.stripe_fee_cad, p_stripe_fee_cad),
          stripe_balance_transaction_id = coalesce(p.stripe_balance_transaction_id, v_txn),
          donation_category = coalesce(p.donation_category, p_donation_category)
        where p.id = existing_id;
      end if;
      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'payment_id', coalesce(existing_id, 0),
        'membership_id', p_membership_id
      );
  end;

  perform public.sync_membership_status_from_payments(p_membership_id);

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'payment_id', new_payment_id,
    'membership_id', p_membership_id
  );
end;
$function$
;


