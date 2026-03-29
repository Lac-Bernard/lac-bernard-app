-- Explicit membership vs donation on payments; membership active when sum(membership_amount) >= tier fee.

alter table public.payments
  add column if not exists membership_amount numeric,
  add column if not exists donation_amount numeric,
  add column if not exists donation_note text;

create or replace function public._backfill_payment_split_migration()
returns void
language plpgsql
as $$
declare
  r record;
  v_fee numeric;
  v_donation numeric;
  v_dnote text;
  v_mem numeric;
  m1 text[];
  m2 text[];
  m3 text[];
begin
  for r in
    select p.id, p.amount, p.method, p.notes, p.membership_id, ms.tier
    from public.payments p
    join public.memberships ms on ms.id = p.membership_id
  loop
    v_fee :=
      case r.tier
        when 'general' then 75::numeric
        when 'associate' then 25::numeric
        else null
      end;

    v_donation := 0;
    v_mem := coalesce(r.amount, 0);
    v_dnote := null;

    if r.method = 'stripe' and r.notes is not null then
      m1 := regexp_match(r.notes, 'donation\s*\$\s*([0-9]+(?:\.[0-9]{1,2})?)\s*CAD', 'i');
      m2 := regexp_match(r.notes, 'donation\s*\$\s*([0-9]+(?:\.[0-9]{1,2})?)(?:\s*CAD)?', 'i');
      if m1 is not null then
        v_donation := m1[1]::numeric;
        v_mem := round((coalesce(r.amount, 0) - v_donation)::numeric, 2);
      elsif m2 is not null then
        v_donation := m2[1]::numeric;
        v_mem := round((coalesce(r.amount, 0) - v_donation)::numeric, 2);
      elsif v_fee is not null and coalesce(r.amount, 0) > v_fee then
        v_mem := v_fee;
        v_donation := round((coalesce(r.amount, 0) - v_fee)::numeric, 2);
      end if;

      m3 := regexp_match(r.notes, 'Donation note:\s*(.+?)(?:\s*·\s*|$)', 'i');
      if m3 is not null then
        v_dnote := trim(both from m3[1]);
        if v_dnote = '' then
          v_dnote := null;
        end if;
      end if;
    end if;

    update public.payments
    set
      membership_amount = v_mem,
      donation_amount = v_donation,
      donation_note = v_dnote
    where id = r.id;
  end loop;
end;
$$;

select public._backfill_payment_split_migration();
drop function public._backfill_payment_split_migration();

-- amount can be null in legacy rows; coalesce so NOT NULL + split check can succeed
update public.payments
set
  membership_amount = coalesce(membership_amount, coalesce(amount, 0)),
  donation_amount = coalesce(donation_amount, 0)
where membership_amount is null or donation_amount is null;

alter table public.payments
  alter column membership_amount set not null,
  alter column membership_amount set default 0,
  alter column donation_amount set not null,
  alter column donation_amount set default 0;

alter table public.payments
  add constraint payments_membership_donation_split_check
  check (
    membership_amount >= 0
    and donation_amount >= 0
    and round((membership_amount + donation_amount)::numeric, 2) = round(amount::numeric, 2)
  );

comment on column public.payments.membership_amount is 'Portion applied to membership dues for this membership year.';
comment on column public.payments.donation_amount is 'Optional donation portion (same payment row as dues).';
comment on column public.payments.donation_note is 'Optional note for the donation (e.g. Stripe checkout).';

-- Tier fee in CAD (must match app MEMBERSHIP_TIER_CENTS / 100).
create or replace function public.membership_tier_fee_amount(p_tier text)
returns numeric
language sql
immutable
strict
as $$
  select case p_tier
    when 'general' then 75::numeric
    when 'associate' then 25::numeric
    else null
  end;
$$;

revoke all on function public.membership_tier_fee_amount(text) from public;
grant execute on function public.membership_tier_fee_amount(text) to service_role;

comment on function public.membership_tier_fee_amount(text) is
  'Expected annual membership dues in CAD for tier (general 75, associate 25).';

create or replace function public.sync_membership_status_from_payments(p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text;
  v_fee numeric;
  v_sum numeric;
begin
  select tier into v_tier
  from public.memberships
  where id = p_membership_id;

  if not found then
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
$$;

revoke all on function public.sync_membership_status_from_payments(uuid) from public;
revoke execute on function public.sync_membership_status_from_payments(uuid) from anon, authenticated;
grant execute on function public.sync_membership_status_from_payments(uuid) to service_role;

comment on function public.sync_membership_status_from_payments(uuid) is
  'Set membership active if sum(membership_amount) >= tier fee, else pending. service_role only.';

-- Stripe: idempotent insert + sync status (no longer force active on insert).
drop function if exists public.record_stripe_payment(uuid, numeric, text, text);

create or replace function public.record_stripe_payment(
  p_membership_id uuid,
  p_amount numeric,
  p_membership_amount numeric,
  p_donation_amount numeric,
  p_stripe_payment_id text,
  p_notes text,
  p_donation_note text
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
begin
  if p_stripe_payment_id is null or trim(p_stripe_payment_id) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_payment_id');
  end if;

  select id into existing_id
  from public.payments
  where method = 'stripe'
    and payment_id = p_stripe_payment_id
  limit 1;

  if existing_id is not null then
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
      donation_note
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
      nullif(trim(p_donation_note), '')
    )
    returning id into new_payment_id;
  exception
    when unique_violation then
      select id into existing_id
      from public.payments
      where method = 'stripe'
        and payment_id = p_stripe_payment_id
      limit 1;
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

revoke all on function public.record_stripe_payment(uuid, numeric, numeric, numeric, text, text, text) from public;
revoke execute on function public.record_stripe_payment(uuid, numeric, numeric, numeric, text, text, text) from anon, authenticated;
grant execute on function public.record_stripe_payment(uuid, numeric, numeric, numeric, text, text, text) to service_role;

comment on function public.record_stripe_payment(uuid, numeric, numeric, numeric, text, text, text) is
  'Insert Stripe payment with explicit dues/donation split; sync membership status. Idempotent on payment_id. service_role only.';

-- Manual payment: split + sync; allow donation-only when membership is active or pending with no dues left.
drop function if exists public.record_manual_payment(uuid, numeric, text, date, text);

create or replace function public.record_manual_payment(
  p_membership_id uuid,
  p_amount numeric,
  p_membership_amount numeric,
  p_donation_amount numeric,
  p_method text,
  p_payment_date date,
  p_notes text,
  p_donation_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.memberships%rowtype;
  new_payment_id bigint;
  v_fee numeric;
  v_paid numeric;
  v_round_total numeric;
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
    if m.status is distinct from 'pending' then
      return jsonb_build_object('ok', false, 'error', 'dues_only_when_pending');
    end if;
    if round((v_paid + p_membership_amount)::numeric, 2) > round(v_fee::numeric, 2) then
      return jsonb_build_object('ok', false, 'error', 'membership_overpay');
    end if;
  else
    -- donation-only: require tier dues already satisfied by prior payments
    if p_donation_amount <= 0 then
      return jsonb_build_object('ok', false, 'error', 'invalid_split');
    end if;
    if round(v_paid::numeric, 2) < round(v_fee::numeric, 2) then
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
    donation_note
  )
  values (
    p_membership_id,
    p_method,
    p_amount,
    coalesce(p_payment_date, (now() at time zone 'America/Toronto')::date),
    nullif(trim(p_notes), ''),
    null,
    p_membership_amount,
    p_donation_amount,
    nullif(trim(p_donation_note), '')
  )
  returning id into new_payment_id;

  perform public.sync_membership_status_from_payments(p_membership_id);

  return jsonb_build_object(
    'ok', true,
    'payment_id', new_payment_id,
    'membership_id', p_membership_id
  );
end;
$$;

revoke all on function public.record_manual_payment(uuid, numeric, numeric, numeric, text, date, text, text) from public;
revoke execute on function public.record_manual_payment(uuid, numeric, numeric, numeric, text, date, text, text) from anon, authenticated;
grant execute on function public.record_manual_payment(uuid, numeric, numeric, numeric, text, date, text, text) to service_role;

comment on function public.record_manual_payment(uuid, numeric, numeric, numeric, text, date, text, text) is
  'Insert manual payment with dues/donation split; sync membership status. service_role only.';

-- admin_create_membership: initial payment is all dues unless extended later.
create or replace function public.admin_create_membership(
  p_member_id uuid,
  p_year smallint,
  p_tier text,
  p_outcome text,
  p_amount numeric,
  p_method text,
  p_payment_date date,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership_id uuid;
  v_payment_id bigint;
  v_elig jsonb;
begin
  if not exists (select 1 from public.members where id = p_member_id) then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;

  if p_tier is null or p_tier not in ('general', 'associate') then
    return jsonb_build_object('ok', false, 'error', 'invalid_tier');
  end if;

  if p_outcome is null or p_outcome not in ('pending', 'record_payment') then
    return jsonb_build_object('ok', false, 'error', 'invalid_outcome');
  end if;

  if exists (select 1 from public.memberships where member_id = p_member_id and year = p_year) then
    return jsonb_build_object('ok', false, 'error', 'already_exists');
  end if;

  if p_tier = 'general' then
    v_elig := public.admin_membership_general_eligible(p_member_id, p_year);
    if coalesce(v_elig->>'ok', '') <> 'true' then
      return jsonb_build_object('ok', false, 'error', coalesce(v_elig->>'error', 'eligibility_failed'));
    end if;
  end if;

  if p_outcome = 'record_payment' then
    if p_method is null or p_method not in ('e-transfer', 'cheque', 'cash', 'unknown') then
      return jsonb_build_object('ok', false, 'error', 'invalid_method');
    end if;
    if p_amount is null or p_amount < 0 then
      return jsonb_build_object('ok', false, 'error', 'invalid_amount');
    end if;
  end if;

  begin
    insert into public.memberships (member_id, year, tier, status)
    values (p_member_id, p_year, p_tier, 'pending')
    returning id into v_membership_id;
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'error', 'already_exists');
  end;

  if p_outcome = 'pending' then
    return jsonb_build_object('ok', true, 'membership_id', v_membership_id);
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
    donation_note
  )
  values (
    v_membership_id,
    p_method,
    p_amount,
    coalesce(p_payment_date, (now() at time zone 'America/Toronto')::date),
    nullif(trim(p_notes), ''),
    null,
    p_amount,
    0,
    null
  )
  returning id into v_payment_id;

  perform public.sync_membership_status_from_payments(v_membership_id);

  return jsonb_build_object(
    'ok', true,
    'membership_id', v_membership_id,
    'payment_id', v_payment_id
  );
end;
$$;

-- Re-sync all memberships after backfill (status from sum of membership_amount).
do $$
declare
  r record;
begin
  for r in select id from public.memberships
  loop
    perform public.sync_membership_status_from_payments(r.id);
  end loop;
end;
$$;
