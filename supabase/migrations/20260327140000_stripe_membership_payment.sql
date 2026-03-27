-- Stripe checkout completion: idempotent payment row + activate pending membership (service_role only).
alter table public.members
  add column if not exists stripe_customer_id text;

create unique index if not exists members_stripe_customer_id_key
  on public.members (stripe_customer_id)
  where stripe_customer_id is not null;

comment on column public.members.stripe_customer_id is 'Stripe Customer id (cus_…) for hosted Checkout, future invoices, and portal.';

create or replace function public.record_stripe_payment(
  p_membership_id uuid,
  p_amount numeric,
  p_stripe_payment_id text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.memberships%rowtype;
  new_payment_id bigint;
  existing_id bigint;
begin
  if p_stripe_payment_id is null or trim(p_stripe_payment_id) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_payment_id');
  end if;

  select id into existing_id
  from public.payments
  where method = 'stripe'
    and payment_id = p_stripe_payment_id
  limit 1;

  if existing_id is not null then
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'payment_id', existing_id,
      'membership_id', p_membership_id
    );
  end if;

  select * into m
  from public.memberships
  where id = p_membership_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if m.status is distinct from 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  if p_amount is null or p_amount < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_amount');
  end if;

  begin
    insert into public.payments (membership_id, method, amount, date, notes, payment_id)
    values (
      p_membership_id,
      'stripe',
      p_amount,
      (now() at time zone 'America/Toronto')::date,
      nullif(trim(p_notes), ''),
      p_stripe_payment_id
    )
    returning id into new_payment_id;
  exception
    when unique_violation then
      select id into existing_id
      from public.payments
      where method = 'stripe'
        and payment_id = p_stripe_payment_id
      limit 1;
      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'payment_id', coalesce(existing_id, 0),
        'membership_id', p_membership_id
      );
  end;

  update public.memberships
  set status = 'active'
  where id = p_membership_id;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'payment_id', new_payment_id,
    'membership_id', p_membership_id
  );
end;
$$;

revoke all on function public.record_stripe_payment(uuid, numeric, text, text) from public;
revoke execute on function public.record_stripe_payment(uuid, numeric, text, text) from anon, authenticated;
grant execute on function public.record_stripe_payment(uuid, numeric, text, text) to service_role;

comment on function public.record_stripe_payment(uuid, numeric, text, text) is
  'Insert Stripe payment and set membership to active. Idempotent on payment_id. service_role only.';

create unique index if not exists payments_stripe_payment_id_unique
  on public.payments (payment_id)
  where method = 'stripe' and payment_id is not null;
