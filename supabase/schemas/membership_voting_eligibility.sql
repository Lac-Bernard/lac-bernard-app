CREATE OR REPLACE FUNCTION public.membership_voting_eligibility(p_member_id uuid, p_year smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

revoke all on function public.membership_voting_eligibility(p_member_id uuid, p_year smallint) from public;
grant execute on function public.membership_voting_eligibility(p_member_id uuid, p_year smallint) to anon, authenticated, service_role;
comment on function public.membership_voting_eligibility(p_member_id uuid, p_year smallint) is
  'Whether member may purchase voting membership: lake address required; one voting membership per address per year.';
