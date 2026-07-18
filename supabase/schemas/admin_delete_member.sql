CREATE OR REPLACE FUNCTION public.admin_delete_member(p_member_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  m public.members%rowtype;
  v_membership_count int;
begin
  select * into m
  from public.members
  where id = p_member_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select count(*) into v_membership_count
  from public.memberships
  where member_id = p_member_id;

  if v_membership_count > 0 then
    return jsonb_build_object('ok', false, 'error', 'has_memberships');
  end if;

  delete from public.members where id = p_member_id;

  return jsonb_build_object('ok', true, 'member_id', p_member_id, 'user_id', m.user_id);
end;
$function$;

revoke all on function public.admin_delete_member(p_member_id uuid) from public;
grant execute on function public.admin_delete_member(p_member_id uuid) to service_role;
comment on function public.admin_delete_member(p_member_id uuid) is
  'Hard-deletes a member with no memberships. Returns the member''s linked user_id (if any) so the caller can also remove the auth.users identity. service_role only.';
