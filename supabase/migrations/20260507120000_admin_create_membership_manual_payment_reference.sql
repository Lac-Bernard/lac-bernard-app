-- Add optional external reference on the initial manual payment (e-transfer id, cheque #, etc.).
-- Stored in payments.payment_id (same column used for other payment references).

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

  if p_outcome is null or p_outcome not in ('pending', 'record_payment') then
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
  'Create membership (pending or with manual payment + status sync); optional external reference stored in payments.payment_id. service_role only.';

