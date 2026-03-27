-- Normalized key for "same lake property" (civic + street). NULL if incomplete.
create or replace function public.normalize_lake_address_key(civic text, street text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when nullif(trim(coalesce(civic, '')), '') is null
      or nullif(trim(coalesce(street, '')), '') is null
    then null
    else
      lower(regexp_replace(trim(civic), '\s+', ' ', 'g'))
      || E'\x1e'
      || lower(regexp_replace(trim(street), '\s+', ' ', 'g'))
  end;
$$;

comment on function public.normalize_lake_address_key(text, text) is
  'Deterministic key for lake civic + street; NULL if either part empty after trim.';

-- May this member start a general (voting) membership for the year? Caller must own the member row.
create or replace function public.membership_general_eligibility(p_member_id uuid, p_year smallint)
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

revoke all on function public.normalize_lake_address_key(text, text) from public;
grant execute on function public.normalize_lake_address_key(text, text) to authenticated;

revoke all on function public.membership_general_eligibility(uuid, smallint) from public;
grant execute on function public.membership_general_eligibility(uuid, smallint) to authenticated;

comment on function public.membership_general_eligibility(uuid, smallint) is
  'Whether member may purchase general membership: lake address required; one general per address per year.';
