-- Atomic manual payment: insert payment row and activate pending membership (service_role API only).
create or replace function public.record_manual_payment(
  p_membership_id uuid,
  p_amount numeric,
  p_method text,
  p_payment_date date,
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
begin
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

  if p_method is null or p_method not in ('e-transfer', 'cheque', 'cash', 'unknown') then
    return jsonb_build_object('ok', false, 'error', 'invalid_method');
  end if;

  if p_amount is null or p_amount < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_amount');
  end if;

  insert into public.payments (membership_id, method, amount, date, notes, payment_id)
  values (
    p_membership_id,
    p_method,
    p_amount,
    coalesce(p_payment_date, (now() at time zone 'America/Toronto')::date),
    nullif(trim(p_notes), ''),
    null
  )
  returning id into new_payment_id;

  update public.memberships
  set status = 'active'
  where id = p_membership_id;

  return jsonb_build_object(
    'ok', true,
    'payment_id', new_payment_id,
    'membership_id', p_membership_id
  );
end;
$$;

revoke all on function public.record_manual_payment(uuid, numeric, text, date, text) from public;
revoke execute on function public.record_manual_payment(uuid, numeric, text, date, text) from anon, authenticated;
grant execute on function public.record_manual_payment(uuid, numeric, text, date, text) to service_role;

comment on function public.record_manual_payment(uuid, numeric, text, date, text) is
  'Insert manual payment and set membership to active. Execute restricted to service_role.';

-- Append-only audit trail for admin actions (written via service_role from API routes).
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_user_id uuid not null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb
);

alter table public.admin_audit_log enable row level security;

comment on table public.admin_audit_log is 'Admin actions (inserted server-side with service role only).';

grant select, insert on table public.admin_audit_log to service_role;
