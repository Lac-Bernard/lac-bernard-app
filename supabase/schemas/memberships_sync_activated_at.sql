CREATE OR REPLACE FUNCTION public.memberships_sync_activated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'INSERT' then
    if new.status = 'active' then
      new.activated_at := coalesce(new.activated_at, now());
    else
      new.activated_at := null;
    end if;
    return new;
  end if;

  if new.status = 'active' and old.status is distinct from 'active' then
    new.activated_at := coalesce(new.activated_at, now());
  elsif new.status is distinct from 'active' then
    new.activated_at := null;
  end if;

  return new;
end;
$function$;

revoke all on function public.memberships_sync_activated_at() from public;
grant execute on function public.memberships_sync_activated_at() to anon, authenticated, service_role;

create trigger memberships_sync_activated_at
  before insert or update of status, activated_at on public.memberships
  for each row
  execute function public.memberships_sync_activated_at();
