-- Admin-only: general tier rules without JWT (service_role API).
create or replace function public.admin_membership_general_eligible(
  p_member_id uuid,
  p_year smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_civic text;
  v_street text;
  v_key text;
  v_taken boolean;
begin
  select m.lake_civic_number, m.lake_street_name
  into v_civic, v_street
  from public.members m
  where m.id = p_member_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_key := public.normalize_lake_address_key(v_civic, v_street);

  if v_key is null then
    return jsonb_build_object('ok', false, 'error', 'no_lake_address');
  end if;

  select exists (
    select 1
    from public.memberships ms
    join public.members m on m.id = ms.member_id
    where ms.year = p_year
      and ms.tier = 'general'
      and ms.status in ('pending', 'active')
      and public.normalize_lake_address_key(m.lake_civic_number, m.lake_street_name) = v_key
      and ms.member_id <> p_member_id
  )
  into v_taken;

  if v_taken then
    return jsonb_build_object('ok', false, 'error', 'general_address_taken');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_membership_general_eligible(uuid, smallint) from public;
revoke execute on function public.admin_membership_general_eligible(uuid, smallint) from anon, authenticated;
grant execute on function public.admin_membership_general_eligible(uuid, smallint) to service_role;

comment on function public.admin_membership_general_eligible(uuid, smallint) is
  'General membership rules (lake address + one general per property per year). service_role only.';

-- Atomic: insert pending membership; optionally record manual payment and activate.
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

  insert into public.payments (membership_id, method, amount, date, notes, payment_id)
  values (
    v_membership_id,
    p_method,
    p_amount,
    coalesce(p_payment_date, (now() at time zone 'America/Toronto')::date),
    nullif(trim(p_notes), ''),
    null
  )
  returning id into v_payment_id;

  update public.memberships
  set status = 'active'
  where id = v_membership_id;

  return jsonb_build_object(
    'ok', true,
    'membership_id', v_membership_id,
    'payment_id', v_payment_id
  );
end;
$$;

revoke all on function public.admin_create_membership(uuid, smallint, text, text, numeric, text, date, text) from public;
revoke execute on function public.admin_create_membership(uuid, smallint, text, text, numeric, text, date, text) from anon, authenticated;
grant execute on function public.admin_create_membership(uuid, smallint, text, text, numeric, text, date, text) to service_role;

comment on function public.admin_create_membership(uuid, smallint, text, text, numeric, text, date, text) is
  'Create membership (pending or with manual payment + active). service_role only.';
