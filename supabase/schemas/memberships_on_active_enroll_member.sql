CREATE OR REPLACE FUNCTION public.memberships_on_active_enroll_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    update public.members
    set status = 'enrolled'
    where id = new.member_id
      and status = 'new';
  end if;
  return new;
end;
$function$;

revoke all on function public.memberships_on_active_enroll_member() from public;
grant execute on function public.memberships_on_active_enroll_member() to anon, authenticated, service_role;
comment on function public.memberships_on_active_enroll_member() is
  'After membership becomes active: set members.status from new to enrolled.';

create trigger memberships_on_active_enroll_member
  after insert or update of status on public.memberships
  for each row
  execute function public.memberships_on_active_enroll_member();
