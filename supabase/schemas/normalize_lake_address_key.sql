CREATE OR REPLACE FUNCTION public.normalize_lake_address_key(civic text, street text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when nullif(trim(coalesce(civic, '')), '') is null
      or nullif(trim(coalesce(street, '')), '') is null
    then null
    else
      lower(regexp_replace(trim(civic), '\s+', ' ', 'g'))
      || E'\x1e'
      || lower(regexp_replace(trim(street), '\s+', ' ', 'g'))
  end;
$function$;

revoke all on function public.normalize_lake_address_key(civic text, street text) from public;
grant execute on function public.normalize_lake_address_key(civic text, street text) to anon, authenticated, service_role;
comment on function public.normalize_lake_address_key(civic text, street text) is
  'Deterministic key for lake civic + street; NULL if either part empty after trim.';
