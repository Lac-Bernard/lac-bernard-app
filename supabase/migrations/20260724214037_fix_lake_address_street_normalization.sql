create extension if not exists "unaccent" with schema "extensions";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.normalize_lake_address_key(civic text, street text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  with civic_cleaned as (
    select lower(regexp_replace(coalesce(civic, ''), '[^a-zA-Z0-9]', '', 'g')) as alnum
  ),
  civic_parts as (
    select
      regexp_replace(alnum, '[^0-9]', '', 'g') as digits,
      regexp_replace(alnum, '[0-9]', '', 'g') as letters
    from civic_cleaned
  ),
  civic_key as (
    -- Digits-then-letters with separators stripped and leading zeros dropped, so "A-123",
    -- "123A", and "007-A" (Places-composed vs manually-typed civic numbers) all collide.
    select
      coalesce(nullif(regexp_replace(digits, '^0+', ''), ''), case when digits = '' then '' else '0' end) || letters as key
    from civic_parts
  ),
  street_base as (
    -- Hyphens treated as word separators (Quebec toponymy often hyphenates compound names,
    -- e.g. "Lac-Bernard", that a manual entrant just as often writes with a space) and accents
    -- folded (Places returns the accented official form; manual entry often omits accents).
    select lower(extensions.unaccent(
      'extensions.unaccent'::regdictionary,
      regexp_replace(regexp_replace(trim(coalesce(street, '')), '-', ' ', 'g'), '\s+', ' ', 'g')
    )) as base
  ),
  street_core as (
    -- Strip a leading run of generic road-type words/articles (Places includes them in its
    -- official route name, e.g. "Chemin de la Baie-Regatta"; manual entrants often type only
    -- the distinctive part, e.g. "Baie Regatta") so both collapse to the same core name.
    select
      trim(regexp_replace(
        base,
        '^(?:(?:chemin|rue|route|rte|boulevard|blvd|avenue|ave|impasse|place|promenade|montee|rang|cours|allee|voie|prom|de|du|des|le|la|les)\s+)+',
        ''
      )) as core,
      base
    from street_base
  ),
  street_key as (
    -- Fall back to the un-stripped name if stripping consumed the whole string (e.g. a street
    -- literally named after a generic word), so two such edge cases don't collide on ''.
    select case when core = '' then base else core end as key
    from street_core
  )
  select case
    when nullif(trim(coalesce(civic, '')), '') is null
      or nullif(trim(coalesce(street, '')), '') is null
    then null
    else (select key from civic_key) || E'\x1e' || (select key from street_key)
  end;
$function$
;


