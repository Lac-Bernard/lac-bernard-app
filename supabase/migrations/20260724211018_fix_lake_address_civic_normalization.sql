set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.normalize_lake_address_key(civic text, street text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  with cleaned as (
    select lower(regexp_replace(coalesce(civic, ''), '[^a-zA-Z0-9]', '', 'g')) as civic_alnum
  )
  select case
    when nullif(trim(coalesce(civic, '')), '') is null
      or nullif(trim(coalesce(street, '')), '') is null
    then null
    else
      (regexp_replace(civic_alnum, '[^0-9]', '', 'g') || regexp_replace(civic_alnum, '[0-9]', '', 'g'))
      || E'\x1e'
      || lower(regexp_replace(trim(street), '\s+', ' ', 'g'))
  end
  from cleaned;
$function$
;


