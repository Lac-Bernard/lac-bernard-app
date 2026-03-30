-- Paginated admin audit log with actor email (auth.users) for the admin UI.

create or replace function public.admin_audit_log_page(p_limit int, p_offset int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
  v_entries jsonb;
  v_lim int := greatest(coalesce(p_limit, 25), 1);
  v_off int := greatest(coalesce(p_offset, 0), 0);
begin
  select count(*)::bigint into v_total from public.admin_audit_log;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'created_at', p.created_at,
        'actor_user_id', p.actor_user_id,
        'actor_email', p.actor_email,
        'action', p.action,
        'entity_type', p.entity_type,
        'entity_id', p.entity_id,
        'metadata', p.metadata
      )
      order by p.created_at desc
    ),
    '[]'::jsonb
  )
  into v_entries
  from (
    select
      a.id,
      a.created_at,
      a.actor_user_id,
      u.email::text as actor_email,
      a.action,
      a.entity_type,
      a.entity_id,
      a.metadata
    from public.admin_audit_log a
    left join auth.users u on u.id = a.actor_user_id
    order by a.created_at desc
    limit v_lim
    offset v_off
  ) p;

  return jsonb_build_object('entries', v_entries, 'total', v_total);
end;
$$;

revoke all on function public.admin_audit_log_page(int, int) from public;
grant execute on function public.admin_audit_log_page(int, int) to service_role;

comment on function public.admin_audit_log_page(int, int) is
  'Paginated audit rows newest first, with actor email from auth.users. service_role only.';
