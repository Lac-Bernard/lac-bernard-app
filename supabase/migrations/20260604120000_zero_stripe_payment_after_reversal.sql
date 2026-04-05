-- Full Stripe refund / lost dispute: zero the payment row and re-sync membership status (service_role only).
create or replace function public.zero_stripe_payment_after_reversal(p_payment_intent_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    donation_note = null
  where method = 'stripe'
    and payment_id = trim(p_payment_intent_id)
  returning membership_id into mid;

  if mid is null then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'not_found');
  end if;

  perform public.sync_membership_status_from_payments(mid);

  return jsonb_build_object('ok', true, 'membership_id', mid);
end;
$$;

revoke all on function public.zero_stripe_payment_after_reversal(text) from public;
revoke execute on function public.zero_stripe_payment_after_reversal(text) from anon, authenticated;
grant execute on function public.zero_stripe_payment_after_reversal(text) to service_role;

comment on function public.zero_stripe_payment_after_reversal(text) is
  'Zero a Stripe payment row by Payment Intent id and re-sync membership status (full refund / chargeback lost). service_role only.';
