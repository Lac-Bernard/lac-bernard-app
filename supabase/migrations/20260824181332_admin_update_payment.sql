set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_update_payment(p_payment_id bigint, p_donation_category text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  p public.payments%rowtype;
begin
  if p_donation_category is not null and p_donation_category not in ('environment', 'regatta', 'general') then
    return jsonb_build_object('ok', false, 'error', 'invalid_donation_category');
  end if;

  select * into p
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if p.donation_amount is null or p.donation_amount = 0 then
    p_donation_category := null;
  end if;

  update public.payments
  set donation_category = p_donation_category
  where id = p_payment_id;

  return jsonb_build_object('ok', true, 'payment_id', p_payment_id, 'donation_category', p_donation_category);
end;
$function$
;

revoke all on function public.admin_update_payment(bigint, text) from public;
revoke execute on function public.admin_update_payment(bigint, text) from anon, authenticated;
grant execute on function public.admin_update_payment(bigint, text) to service_role;

comment on function public.admin_update_payment(bigint, text) is
  'Update editable fields on an existing payment (currently: donation_category only, forced null when the payment has no donation portion). service_role only.';

