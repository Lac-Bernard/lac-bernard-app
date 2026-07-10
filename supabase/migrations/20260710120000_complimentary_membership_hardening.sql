-- Harden complimentary memberships: RLS, upgrade path, block manual payments.

drop policy if exists "memberships_insert_own_pending" on public.memberships;

create policy "memberships_insert_own_pending"
on public.memberships
for insert
to authenticated
with check (
  status = 'pending'
  and complimentary = false
  and year = extract(year from (now() at time zone 'America/Toronto'))::smallint
  and exists (
    select 1
    from public.members m
    where m.id = memberships.member_id
      and (
        m.user_id = auth.uid()
        or (
          m.primary_email is not null
          and lower(trim(m.primary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
        )
      )
  )
);

-- Complimentary associate → voting must clear the flag and require voting-tier dues.
create or replace function public.admin_upgrade_membership_to_voting(p_membership_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke all on function public.admin_upgrade_membership_to_voting(uuid) from public;
revoke execute on function public.admin_upgrade_membership_to_voting(uuid) from anon, authenticated;
grant execute on function public.admin_upgrade_membership_to_voting(uuid) to service_role;

comment on function public.admin_upgrade_membership_to_voting(uuid) is
  'Set membership tier from associate to voting; complimentary rows clear flag and become pending until voting dues paid. service_role only.';

-- Reject manual payments on complimentary memberships (defense in depth; UI hides the button).
create or replace function public.record_manual_payment(
  p_membership_id uuid,
  p_amount numeric,
  p_membership_amount numeric,
  p_donation_amount numeric,
  p_method text,
  p_payment_date date,
  p_notes text,
  p_donation_note text,
  p_reference text default null
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
  v_ref text;
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

  select * into m
  from public.memberships
  where id = p_membership_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if m.complimentary then
    return jsonb_build_object('ok', false, 'error', 'complimentary_membership');
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
    v_ref,
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

revoke all on function public.record_manual_payment(uuid, numeric, numeric, numeric, text, date, text, text, text) from public;
revoke execute on function public.record_manual_payment(uuid, numeric, numeric, numeric, text, date, text, text, text) from anon, authenticated;
grant execute on function public.record_manual_payment(uuid, numeric, numeric, numeric, text, date, text, text, text) to service_role;

comment on function public.record_manual_payment(uuid, numeric, numeric, numeric, text, date, text, text, text) is
  'Insert manual payment with dues/donation split; rejects complimentary memberships. service_role only.';
