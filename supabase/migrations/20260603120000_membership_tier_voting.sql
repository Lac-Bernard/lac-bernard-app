-- Rename membership tier value general → voting (DB, RPCs, filters, eligibility errors).

-- 1) Data + CHECK constraint
alter table public.memberships drop constraint if exists tier;

update public.memberships
set tier = 'voting'
where tier = 'general';

alter table public.memberships
  add constraint tier check ((tier = any (array['voting'::text, 'associate'::text])));

comment on constraint tier on public.memberships is
  'Membership type: voting (one per lake property per year) or associate.';

-- 2) Tier fee helper (Stripe / status sync)
create or replace function public.membership_tier_fee_amount(p_tier text)
returns numeric
language sql
immutable
strict
as $$
  select case p_tier
    when 'voting' then 75::numeric
    when 'associate' then 25::numeric
    else null
  end;
$$;

revoke all on function public.membership_tier_fee_amount(text) from public;
grant execute on function public.membership_tier_fee_amount(text) to service_role;

comment on function public.membership_tier_fee_amount(text) is
  'Expected annual membership dues in CAD for tier (voting 75, associate 25).';

-- 3) Member-facing eligibility (authenticated)
create or replace function public.membership_voting_eligibility(p_member_id uuid, p_year smallint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
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

  if not exists (
    select 1
    from public.members m
    where m.id = p_member_id
      and (
        (m.user_id is not null and m.user_id = auth.uid())
        or (
          m.primary_email is not null
          and lower(trim(m.primary_email)) = v_email
        )
      )
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
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
      and ms.tier = 'voting'
      and ms.status in ('pending', 'active')
      and public.normalize_lake_address_key(m.lake_civic_number, m.lake_street_name) = v_key
      and ms.member_id <> p_member_id
  )
  into v_taken;

  if v_taken then
    return jsonb_build_object('ok', false, 'error', 'voting_address_taken');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.membership_voting_eligibility(uuid, smallint) from public;
grant execute on function public.membership_voting_eligibility(uuid, smallint) to authenticated;

comment on function public.membership_voting_eligibility(uuid, smallint) is
  'Whether member may purchase voting membership: lake address required; one voting membership per address per year.';

drop function if exists public.membership_general_eligibility(uuid, smallint);

-- 4) Admin eligibility (service_role)
create or replace function public.admin_membership_voting_eligible(
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
      and ms.tier = 'voting'
      and ms.status in ('pending', 'active')
      and public.normalize_lake_address_key(m.lake_civic_number, m.lake_street_name) = v_key
      and ms.member_id <> p_member_id
  )
  into v_taken;

  if v_taken then
    return jsonb_build_object('ok', false, 'error', 'voting_address_taken');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_membership_voting_eligible(uuid, smallint) from public;
revoke execute on function public.admin_membership_voting_eligible(uuid, smallint) from anon, authenticated;
grant execute on function public.admin_membership_voting_eligible(uuid, smallint) to service_role;

comment on function public.admin_membership_voting_eligible(uuid, smallint) is
  'Voting membership rules (lake address + one voting membership per property per year). service_role only.';

drop function if exists public.admin_membership_general_eligible(uuid, smallint);

-- 5) Admin create membership
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

revoke all on function public.admin_create_membership(uuid, smallint, text, text, numeric, text, date, text) from public;
revoke execute on function public.admin_create_membership(uuid, smallint, text, text, numeric, text, date, text) from anon, authenticated;
grant execute on function public.admin_create_membership(uuid, smallint, text, text, numeric, text, date, text) to service_role;

-- 6) Admin members list + email export (tier filter)
drop function if exists public.admin_members_page(smallint, text, text, text, text, int, int);

create or replace function public.admin_members_page(
  p_year smallint,
  p_membership text,
  p_tier text,
  p_member_status text,
  p_q text,
  p_sort text,
  p_limit int,
  p_offset int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
  v_members jsonb;
  v_ms text := coalesce(nullif(trim(p_membership), ''), 'active');
  v_tier text := coalesce(nullif(trim(p_tier), ''), 'all');
  v_sort text := coalesce(nullif(trim(p_sort), ''), 'created_at_desc');
  v_mem_st text := lower(coalesce(nullif(trim(p_member_status), ''), 'verified'));
begin
  if v_ms not in ('active', 'not_active', 'all', 'has_membership_history') then
    return jsonb_build_object('error', 'invalid_membership_filter', 'members', '[]'::jsonb, 'total', 0);
  end if;

  if v_tier not in ('all', 'voting', 'associate') then
    return jsonb_build_object('error', 'invalid_tier_filter', 'members', '[]'::jsonb, 'total', 0);
  end if;

  if v_mem_st not in ('verified', 'new', 'disabled', 'all') then
    return jsonb_build_object('error', 'invalid_member_status_filter', 'members', '[]'::jsonb, 'total', 0);
  end if;

  with filtered as (
    select
      m.*,
      (
        select ms.tier::text
        from public.memberships ms
        where ms.member_id = m.id
          and ms.year = p_year
        order by
          case ms.status
            when 'active' then 0
            when 'pending' then 1
            else 2
          end,
          ms.created_at desc
        limit 1
      ) as membership_tier_for_year
    from public.members m
    where
      (
        (
          v_ms = 'active'
          and exists (
            select 1
            from public.memberships ms
            where ms.member_id = m.id
              and ms.year = p_year
              and ms.status = 'active'
              and (v_tier = 'all' or ms.tier::text = v_tier)
          )
        )
        or (
          v_ms = 'not_active'
          and not exists (
            select 1
            from public.memberships ms
            where ms.member_id = m.id
              and ms.year = p_year
              and ms.status = 'active'
          )
          and (
            v_tier = 'all'
            or (
              select ms.tier::text
              from public.memberships ms
              where ms.member_id = m.id
                and ms.year = p_year
              order by
                case ms.status
                  when 'active' then 0
                  when 'pending' then 1
                  else 2
                end,
                ms.created_at desc
              limit 1
            ) is not distinct from v_tier
          )
        )
        or (
          v_ms = 'all'
          and (
            v_tier = 'all'
            or (
              select ms.tier::text
              from public.memberships ms
              where ms.member_id = m.id
                and ms.year = p_year
              order by
                case ms.status
                  when 'active' then 0
                  when 'pending' then 1
                  else 2
                end,
                ms.created_at desc
              limit 1
            ) is not distinct from v_tier
          )
        )
        or (
          v_ms = 'has_membership_history'
          and exists (
            select 1
            from public.memberships ms
            where ms.member_id = m.id
          )
          and (
            v_tier = 'all'
            or (
              select ms.tier::text
              from public.memberships ms
              where ms.member_id = m.id
                and ms.year = p_year
              order by
                case ms.status
                  when 'active' then 0
                  when 'pending' then 1
                  else 2
                end,
                ms.created_at desc
              limit 1
            ) is not distinct from v_tier
          )
        )
      )
      and (v_mem_st = 'all' or m.status::text = v_mem_st)
      and (
        p_q is null
        or length(trim(p_q)) = 0
        or m.last_name ilike '%' || trim(p_q) || '%'
        or m.first_name ilike '%' || trim(p_q) || '%'
        or m.primary_email ilike '%' || trim(p_q) || '%'
        or (m.secondary_email is not null and m.secondary_email ilike '%' || trim(p_q) || '%')
      )
  ),
  paged as (
    select *
    from filtered
    order by
      case when v_sort = 'last_name_asc' then last_name end asc nulls last,
      case when v_sort = 'last_name_asc' then first_name end asc nulls last,
      case when v_sort <> 'last_name_asc' then created_at end desc nulls last
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  )
  select
    (select count(*)::bigint from filtered),
    coalesce((select jsonb_agg(to_jsonb(paged.*)) from paged), '[]'::jsonb)
  into v_total, v_members;

  return jsonb_build_object('members', v_members, 'total', v_total);
end;
$$;

revoke all on function public.admin_members_page(smallint, text, text, text, text, text, int, int) from public;
grant execute on function public.admin_members_page(smallint, text, text, text, text, text, int, int) to service_role;

drop function if exists public.admin_members_export_emails(smallint, text, text, text, text);

create or replace function public.admin_members_export_emails(
  p_year smallint,
  p_membership text,
  p_tier text,
  p_member_status text,
  p_q text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ms text := coalesce(nullif(trim(p_membership), ''), 'active');
  v_tier text := coalesce(nullif(trim(p_tier), ''), 'all');
  v_mem_st text := lower(coalesce(nullif(trim(p_member_status), ''), 'verified'));
  r text;
begin
  if v_ms not in ('active', 'not_active', 'all', 'has_membership_history') then
    return '';
  end if;

  if v_tier not in ('all', 'voting', 'associate') then
    return '';
  end if;

  if v_mem_st not in ('verified', 'new', 'disabled', 'all') then
    return '';
  end if;

  select string_agg(x.pe, ',' order by x.pe)
  into r
  from (
    select min(trim(m.primary_email)) as pe
    from public.members m
    where
      (
        (
          v_ms = 'active'
          and exists (
            select 1
            from public.memberships ms
            where ms.member_id = m.id
              and ms.year = p_year
              and ms.status = 'active'
              and (v_tier = 'all' or ms.tier::text = v_tier)
          )
        )
        or (
          v_ms = 'not_active'
          and not exists (
            select 1
            from public.memberships ms
            where ms.member_id = m.id
              and ms.year = p_year
              and ms.status = 'active'
          )
          and (
            v_tier = 'all'
            or (
              select ms.tier::text
              from public.memberships ms
              where ms.member_id = m.id
                and ms.year = p_year
              order by
                case ms.status
                  when 'active' then 0
                  when 'pending' then 1
                  else 2
                end,
                ms.created_at desc
              limit 1
            ) is not distinct from v_tier
          )
        )
        or (
          v_ms = 'all'
          and (
            v_tier = 'all'
            or (
              select ms.tier::text
              from public.memberships ms
              where ms.member_id = m.id
                and ms.year = p_year
              order by
                case ms.status
                  when 'active' then 0
                  when 'pending' then 1
                  else 2
                end,
                ms.created_at desc
              limit 1
            ) is not distinct from v_tier
          )
        )
        or (
          v_ms = 'has_membership_history'
          and exists (
            select 1
            from public.memberships ms
            where ms.member_id = m.id
          )
          and (
            v_tier = 'all'
            or (
              select ms.tier::text
              from public.memberships ms
              where ms.member_id = m.id
                and ms.year = p_year
              order by
                case ms.status
                  when 'active' then 0
                  when 'pending' then 1
                  else 2
                end,
                ms.created_at desc
              limit 1
            ) is not distinct from v_tier
          )
        )
      )
      and (v_mem_st = 'all' or m.status::text = v_mem_st)
      and (
        p_q is null
        or length(trim(p_q)) = 0
        or m.last_name ilike '%' || trim(p_q) || '%'
        or m.first_name ilike '%' || trim(p_q) || '%'
        or m.primary_email ilike '%' || trim(p_q) || '%'
        or (m.secondary_email is not null and m.secondary_email ilike '%' || trim(p_q) || '%')
      )
      and m.primary_email is not null
      and length(trim(m.primary_email)) > 0
    group by lower(trim(m.primary_email))
  ) x;

  return coalesce(r, '');
end;
$$;

revoke all on function public.admin_members_export_emails(smallint, text, text, text, text) from public;
grant execute on function public.admin_members_export_emails(smallint, text, text, text, text) to service_role;
