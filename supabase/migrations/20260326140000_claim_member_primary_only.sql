-- Simpler linking: first unclaimed row matching primary_email (by created_at), set user_id.
drop function if exists public.claim_member(uuid);

create or replace function public.claim_member()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_id uuid;
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

  select m.id
  into v_id
  from public.members m
  where m.user_id is null
    and m.primary_email is not null
    and lower(trim(m.primary_email)) = v_email
  order by m.created_at asc
  limit 1;

  if v_id is null then
    return jsonb_build_object('status', 'no_match');
  end if;

  update public.members set user_id = v_uid where id = v_id;
  return jsonb_build_object('status', 'claimed', 'member_id', v_id);
end;
$$;

revoke all on function public.claim_member() from public;
grant execute on function public.claim_member() to authenticated;
