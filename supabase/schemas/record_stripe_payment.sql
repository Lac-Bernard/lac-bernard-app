CREATE OR REPLACE FUNCTION public.record_stripe_payment(p_membership_id uuid, p_amount numeric, p_membership_amount numeric, p_donation_amount numeric, p_stripe_payment_id text, p_notes text, p_donation_note text, p_donation_category text DEFAULT NULL::text, p_stripe_fee_cad numeric DEFAULT NULL::numeric, p_stripe_balance_transaction_id text DEFAULT NULL::text)
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
  v_category text;
begin
  if p_stripe_payment_id is null or trim(p_stripe_payment_id) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_payment_id');
  end if;

  v_txn := nullif(trim(coalesce(p_stripe_balance_transaction_id, '')), '');

  if p_stripe_fee_cad is not null and p_stripe_fee_cad < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_stripe_fee');
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
      stripe_balance_transaction_id = coalesce(p.stripe_balance_transaction_id, v_txn)
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
      donation_category,
      stripe_fee_cad,
      stripe_balance_transaction_id
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
      v_category,
      p_stripe_fee_cad,
      v_txn
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
          stripe_balance_transaction_id = coalesce(p.stripe_balance_transaction_id, v_txn)
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
$function$;

revoke all on function public.record_stripe_payment(p_membership_id uuid, p_amount numeric, p_membership_amount numeric, p_donation_amount numeric, p_stripe_payment_id text, p_notes text, p_donation_note text, p_donation_category text, p_stripe_fee_cad numeric, p_stripe_balance_transaction_id text) from public;
revoke execute on function public.record_stripe_payment(p_membership_id uuid, p_amount numeric, p_membership_amount numeric, p_donation_amount numeric, p_stripe_payment_id text, p_notes text, p_donation_note text, p_donation_category text, p_stripe_fee_cad numeric, p_stripe_balance_transaction_id text) from anon, authenticated;
grant execute on function public.record_stripe_payment(p_membership_id uuid, p_amount numeric, p_membership_amount numeric, p_donation_amount numeric, p_stripe_payment_id text, p_notes text, p_donation_note text, p_donation_category text, p_stripe_fee_cad numeric, p_stripe_balance_transaction_id text) to service_role;
comment on function public.record_stripe_payment(p_membership_id uuid, p_amount numeric, p_membership_amount numeric, p_donation_amount numeric, p_stripe_payment_id text, p_notes text, p_donation_note text, p_donation_category text, p_stripe_fee_cad numeric, p_stripe_balance_transaction_id text) is
  'Insert Stripe payment with dues/donation split and optional donation_category; records regardless of membership status (captures charges that land after a membership is made complimentary/active); rejects dues over tier fee (cumulative). Idempotent on payment_id. service_role only.';
