-- One-time link: associate at most one members row per auth user (see app claim flow).
create or replace function public.claim_member(p_member_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  cand_ids uuid[];
  cnt int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if v_email = '' then
    raise exception 'no_email';
  end if;

  if exists (select 1 from public.members where user_id = v_uid) then
    return jsonb_build_object('status', 'already_claimed');
  end if;

  select coalesce(
    array_agg(id order by created_at),
    array[]::uuid[]
  )
  into cand_ids
  from public.members
  where user_id is null
    and (
      (primary_email is not null and lower(trim(primary_email)) = v_email)
      or (secondary_email is not null and lower(trim(secondary_email)) = v_email)
    );

  cnt := coalesce(array_length(cand_ids, 1), 0);

  if cnt = 0 then
    return jsonb_build_object('status', 'no_match');
  end if;

  if cnt = 1 then
    if p_member_id is not null and p_member_id is distinct from cand_ids[1] then
      raise exception 'invalid_member';
    end if;
    update public.members set user_id = v_uid where id = cand_ids[1];
    return jsonb_build_object('status', 'claimed', 'member_id', cand_ids[1]);
  end if;

  if p_member_id is null then
    return (
      select jsonb_build_object(
        'status', 'multiple',
        'candidates', coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', m.id,
              'first_name', m.first_name,
              'last_name', m.last_name,
              'lake_civic_number', m.lake_civic_number,
              'lake_street_name', m.lake_street_name
            )
            order by m.created_at
          ),
          '[]'::jsonb
        )
      )
      from public.members m
      where m.id = any (cand_ids)
    );
  end if;

  if not p_member_id = any (cand_ids) then
    raise exception 'invalid_member';
  end if;

  update public.members set user_id = v_uid where id = p_member_id;
  return jsonb_build_object('status', 'claimed', 'member_id', p_member_id);
end;
$$;

revoke all on function public.claim_member(uuid) from public;
grant execute on function public.claim_member(uuid) to authenticated;
