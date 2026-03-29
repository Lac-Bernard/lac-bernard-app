-- Defensive backfill if any row still has null membership_amount/donation_amount
-- (e.g. legacy payments.amount was null, or a deploy used an older 20260402120000 script).

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payments'
      and column_name = 'membership_amount'
  ) then
    update public.payments
    set
      membership_amount = coalesce(membership_amount, coalesce(amount, 0)),
      donation_amount = coalesce(donation_amount, 0)
    where membership_amount is null or donation_amount is null;
  end if;
end $$;
