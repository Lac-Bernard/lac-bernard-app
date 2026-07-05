set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.zero_stripe_payment_after_reversal(p_payment_intent_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  mid uuid;
begin
  if p_payment_intent_id is null or trim(p_payment_intent_id) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_id');
  end if;

  update public.payments
  set
    amount = 0,
    membership_amount = 0,
    donation_amount = 0,
    donation_note = null,
    stripe_fee_cad = 0,
    stripe_balance_transaction_id = null
  where method = 'stripe'
    and payment_id = trim(p_payment_intent_id)
  returning membership_id into mid;

  if mid is null then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'not_found');
  end if;

  perform public.sync_membership_status_from_payments(mid);

  return jsonb_build_object('ok', true, 'membership_id', mid);
end;
$function$
;

grant delete on table "public"."admin_audit_log" to "anon";

grant insert on table "public"."admin_audit_log" to "anon";

grant select on table "public"."admin_audit_log" to "anon";

grant update on table "public"."admin_audit_log" to "anon";

grant delete on table "public"."admin_audit_log" to "authenticated";

grant insert on table "public"."admin_audit_log" to "authenticated";

grant select on table "public"."admin_audit_log" to "authenticated";

grant update on table "public"."admin_audit_log" to "authenticated";

grant delete on table "public"."admin_audit_log" to "service_role";

grant update on table "public"."admin_audit_log" to "service_role";


