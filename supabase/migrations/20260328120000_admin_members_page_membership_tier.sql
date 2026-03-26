-- Add membership tier (general/associate) for the filter year to admin_members_page rows.

create or replace function public.admin_members_page(
  p_year smallint,
  p_membership text,
  p_q text,
  p_sort text,
  p_limit int,
  p_offset int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
  v_members jsonb;
  v_ms text := coalesce(nullif(trim(p_membership), ''), 'all');
  v_sort text := coalesce(nullif(trim(p_sort), ''), 'created_at_desc');
begin
  if v_ms not in ('all', 'active', 'not_active') then
    return jsonb_build_object('error', 'invalid_membership_filter', 'members', '[]'::jsonb, 'total', 0);
  end if;

  with filtered as (
    select
      m.*,
      (
        select ms.tier::text
        from public.memberships ms
        where ms.member_id = m.id
          and ms.year = p_year
        order by
          case ms.status
            when 'active' then 0
            when 'pending' then 1
            else 2
          end,
          ms.created_at desc
        limit 1
      ) as membership_tier_for_year
    from public.members m
    where
      (
        v_ms = 'all'
        or (
          v_ms = 'active'
          and exists (
            select 1
            from public.memberships ms
            where ms.member_id = m.id
              and ms.year = p_year
              and ms.status = 'active'
          )
        )
        or (
          v_ms = 'not_active'
          and not exists (
            select 1
            from public.memberships ms
            where ms.member_id = m.id
              and ms.year = p_year
              and ms.status = 'active'
          )
        )
      )
      and (
        p_q is null
        or length(trim(p_q)) = 0
        or m.last_name ilike '%' || trim(p_q) || '%'
        or m.first_name ilike '%' || trim(p_q) || '%'
        or m.primary_email ilike '%' || trim(p_q) || '%'
        or (m.secondary_email is not null and m.secondary_email ilike '%' || trim(p_q) || '%')
      )
  ),
  paged as (
    select *
    from filtered
    order by
      case when v_sort = 'last_name_asc' then last_name end asc nulls last,
      case when v_sort = 'last_name_asc' then first_name end asc nulls last,
      case when v_sort <> 'last_name_asc' then created_at end desc nulls last
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  )
  select
    (select count(*)::bigint from filtered),
    coalesce((select jsonb_agg(to_jsonb(paged.*)) from paged), '[]'::jsonb)
  into v_total, v_members;

  return jsonb_build_object('members', v_members, 'total', v_total);
end;
$$;

revoke all on function public.admin_members_page(smallint, text, text, text, int, int) from public;
grant execute on function public.admin_members_page(smallint, text, text, text, int, int) to service_role;

comment on function public.admin_members_page(smallint, text, text, text, int, int) is
  'Paginated members with optional year/membership filter, search, and tier for p_year. service_role only.';
