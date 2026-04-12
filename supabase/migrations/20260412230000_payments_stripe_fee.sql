-- Stripe processing fee (CAD dollars) and balance transaction id for reconciliation / net revenue.

alter table public.payments
  add column if not exists stripe_fee_cad numeric(12, 2),
  add column if not exists stripe_balance_transaction_id text;

comment on column public.payments.stripe_fee_cad is
  'Total Stripe processing fee for this charge in CAD (dollars). Net to platform ≈ amount - stripe_fee_cad when set.';
comment on column public.payments.stripe_balance_transaction_id is
  'Stripe Balance Transaction id (txn_…) for the charge; optional audit trail.';

drop function if exists public.record_stripe_payment(uuid, numeric, numeric, numeric, text, text, text);

create or replace function public.record_stripe_payment(
  p_membership_id uuid,
  p_amount numeric,
  p_membership_amount numeric,
  p_donation_amount numeric,
  p_stripe_payment_id text,
  p_notes text,
  p_donation_note text,
  p_stripe_fee_cad numeric default null,
  p_stripe_balance_transaction_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.memberships%rowtype;
  new_payment_id bigint;
  existing_id bigint;
  v_round_total numeric;
  v_txn text;
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

  select * into m
  from public.memberships
  where id = p_membership_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if m.status is distinct from 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
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
$$;

revoke all on function public.record_stripe_payment(uuid, numeric, numeric, numeric, text, text, text, numeric, text) from public;
revoke execute on function public.record_stripe_payment(uuid, numeric, numeric, numeric, text, text, text, numeric, text) from anon, authenticated;
grant execute on function public.record_stripe_payment(uuid, numeric, numeric, numeric, text, text, text, numeric, text) to service_role;

comment on function public.record_stripe_payment(uuid, numeric, numeric, numeric, text, text, text, numeric, text) is
  'Insert Stripe payment with dues/donation split and optional Stripe fee (CAD) + balance txn id; sync membership status. Idempotent on payment_id. service_role only.';

create or replace function public.zero_stripe_payment_after_reversal(p_payment_intent_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  mid uuid;
begin
  if p_payment_intent_id is null or trim(p_payment_intent_id) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_id');
  end if;

  update public.payments
  set
    amount = 0,
    membership_amount = 0,
    donation_amount = 0,
    donation_note = null,
    stripe_fee_cad = 0,
    stripe_balance_transaction_id = null
  where method = 'stripe'
    and payment_id = trim(p_payment_intent_id)
  returning membership_id into mid;

  if mid is null then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'not_found');
  end if;

  perform public.sync_membership_status_from_payments(mid);

  return jsonb_build_object('ok', true, 'membership_id', mid);
end;
$$;

revoke all on function public.zero_stripe_payment_after_reversal(text) from public;
revoke execute on function public.zero_stripe_payment_after_reversal(text) from anon, authenticated;
grant execute on function public.zero_stripe_payment_after_reversal(text) to service_role;

comment on function public.zero_stripe_payment_after_reversal(text) is
  'Zero a Stripe payment row by Payment Intent id and re-sync membership status (full refund / chargeback lost). Clears fee. service_role only.';
