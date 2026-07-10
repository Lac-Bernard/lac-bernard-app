CREATE OR REPLACE FUNCTION public.membership_tier_fee_amount(p_tier text)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
  select case p_tier
    when 'voting' then 75::numeric
    when 'associate' then 25::numeric
    else null
  end;
$function$;

revoke all on function public.membership_tier_fee_amount(p_tier text) from public;
grant execute on function public.membership_tier_fee_amount(p_tier text) to anon, authenticated, service_role;
comment on function public.membership_tier_fee_amount(p_tier text) is
  'Expected annual membership dues in CAD for tier (voting 75, associate 25).';
