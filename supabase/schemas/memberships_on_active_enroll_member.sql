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

comment on function public.memberships_on_active_enroll_member() is
  'After membership becomes active: set members.status from new to enrolled.';

drop trigger if exists memberships_on_active_enroll_member on public.memberships;

create trigger memberships_on_active_enroll_member
  after insert or update of status on public.memberships
  for each row
  execute function public.memberships_on_active_enroll_member();
