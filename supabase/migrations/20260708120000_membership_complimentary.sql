-- Complimentary memberships: admin can grant a membership for free (e.g. AGM-approved comp years)
-- without creating any payment row, so finance reporting never shows money collected that wasn't.

alter table public.memberships
  add column if not exists complimentary boolean not null default false;

comment on column public.memberships.complimentary is
  'True when the membership was granted free by an admin (no payment collected). Status sync ignores these rows.';

-- Skip status recompute for complimentary memberships: they have no payment rows to sum,
-- so the normal dues-vs-fee comparison would otherwise flip them back to pending.
create or replace function public.sync_membership_status_from_payments(p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke all on function public.sync_membership_status_from_payments(uuid) from public;
revoke execute on function public.sync_membership_status_from_payments(uuid) from anon, authenticated;
grant execute on function public.sync_membership_status_from_payments(uuid) to service_role;

comment on function public.sync_membership_status_from_payments(uuid) is
  'Set membership active if sum(membership_amount) >= tier fee, else pending; no-op for complimentary memberships. service_role only.';

-- admin_create_membership: add 'complimentary' outcome (active, no payment row, flagged for finance).
create or replace function public.admin_create_membership(
  p_member_id uuid,
  p_year smallint,
  p_tier text,
  p_outcome text,
  p_amount numeric,
  p_method text,
  p_payment_date date,
  p_notes text,
  p_reference text default null
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
  v_fee numeric;
  v_membership_amount numeric;
  v_donation_amount numeric;
  v_ref text;
begin
  if not exists (select 1 from public.members where id = p_member_id) then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;

  if p_tier is null or p_tier not in ('voting', 'associate') then
    return jsonb_build_object('ok', false, 'error', 'invalid_tier');
  end if;

  if p_outcome is null or p_outcome not in ('pending', 'record_payment', 'complimentary') then
    return jsonb_build_object('ok', false, 'error', 'invalid_outcome');
  end if;

  if exists (select 1 from public.memberships where member_id = p_member_id and year = p_year) then
    return jsonb_build_object('ok', false, 'error', 'already_exists');
  end if;

  if p_tier = 'voting' then
    v_elig := public.admin_membership_voting_eligible(p_member_id, p_year);
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

  v_ref := nullif(left(trim(coalesce(p_reference, '')), 512), '');

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

  if p_outcome = 'complimentary' then
    update public.memberships
    set status = 'active', complimentary = true
    where id = v_membership_id;

    return jsonb_build_object('ok', true, 'membership_id', v_membership_id);
  end if;

  v_fee := public.membership_tier_fee_amount(p_tier);
  if v_fee is null then
    v_membership_amount := round(p_amount::numeric, 2);
    v_donation_amount := 0;
  else
    v_membership_amount := round(least(p_amount::numeric, v_fee::numeric), 2);
    v_donation_amount := round((p_amount::numeric - v_membership_amount)::numeric, 2);
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
    v_ref,
    v_membership_amount,
    v_donation_amount,
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

revoke all on function public.admin_create_membership(uuid, smallint, text, text, numeric, text, date, text, text) from public;
revoke execute on function public.admin_create_membership(uuid, smallint, text, text, numeric, text, date, text, text) from anon, authenticated;
grant execute on function public.admin_create_membership(uuid, smallint, text, text, numeric, text, date, text, text) to service_role;

comment on function public.admin_create_membership(uuid, smallint, text, text, numeric, text, date, text, text) is
  'Create membership (pending, with manual payment, or complimentary with no payment row); status sync. service_role only.';
