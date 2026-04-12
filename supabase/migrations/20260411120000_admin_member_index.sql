-- Member admin index: named views (voting, mailing, pending, lapsed, incomplete, all), search, counts.

create or replace function public.admin_member_index(
  p_view text,
  p_year smallint,
  p_lapsed_since smallint,
  p_include_disabled boolean,
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
  v_view text := lower(trim(coalesce(p_view, '')));
  v_sort text := lower(trim(coalesce(p_sort, '')));
  v_q text := nullif(trim(coalesce(p_q, '')), '');
  v_year smallint := coalesce(p_year, extract(year from now())::smallint);
  v_lapsed smallint := coalesce(p_lapsed_since, (v_year - 1)::smallint);
  v_inc_dis boolean := coalesce(p_include_disabled, false);
  v_total bigint;
  v_members jsonb;
  v_counts jsonb;
  v_email_opt_in int;
  v_search_disabled bigint := 0;
begin
  if v_view not in ('voting', 'mailing', 'pending', 'lapsed', 'incomplete', 'all') then
    return jsonb_build_object(
      'error', 'invalid_view',
      'members', '[]'::jsonb,
      'total', 0,
      'counts', '{}'::jsonb
    );
  end if;

  if v_sort not in ('last_name_asc', 'last_name_desc', 'created_at_desc', 'created_at_asc') then
    v_sort := 'last_name_asc';
  end if;

  -- Counts for pills (ignore search — always reflect directory state for year / lapsed_since / include_disabled on "all" only)
  with
  voting_f as (
    select m.id from public.members m
    where m.status::text <> 'disabled'
      and exists (
        select 1 from public.memberships ms
        where ms.member_id = m.id and ms.year = v_year
          and ms.status = 'active' and ms.tier = 'voting'
      )
  ),
  mailing_f as (
    select m.id from public.members m
    where m.status::text <> 'disabled'
      and exists (
        select 1 from public.memberships ms
        where ms.member_id = m.id and ms.year = v_year
          and ms.status = 'active'
      )
  ),
  pending_f as (
    select m.id from public.members m
    where m.status::text <> 'disabled'
      and exists (
        select 1 from public.memberships ms
        where ms.member_id = m.id and ms.year = v_year
          and ms.status = 'pending'
      )
  ),
  lapsed_f as (
    select m.id from public.members m
    where m.status::text = 'enrolled'
      and exists (
        select 1 from public.memberships ms
        where ms.member_id = m.id and ms.year >= v_lapsed
      )
      and not exists (
        select 1 from public.memberships ms
        where ms.member_id = m.id and ms.year = v_year
          and ms.status in ('active', 'pending')
      )
  ),
  incomplete_f as (
    select m.id from public.members m
    where m.status::text = 'new'
      and not exists (select 1 from public.memberships ms where ms.member_id = m.id)
  ),
  all_f as (
    select m.id from public.members m
    where (v_inc_dis or m.status::text <> 'disabled')
  )
  select jsonb_build_object(
    'voting', (select count(*)::int from voting_f),
    'mailing', (select count(*)::int from mailing_f),
    'pending', (select count(*)::int from pending_f),
    'lapsed', (select count(*)::int from lapsed_f),
    'incomplete', (select count(*)::int from incomplete_f),
    'all', (select count(*)::int from all_f)
  )
  into v_counts;

  -- Email opt-in sub-counts (mailing & lapsed, non-disabled only; same filters as views)
  if v_view in ('mailing', 'lapsed') and v_q is null then
    if v_view = 'mailing' then
      select count(*)::int
      into v_email_opt_in
      from public.members m
      where m.status::text <> 'disabled'
        and m.email_opt_in = true
        and exists (
          select 1 from public.memberships ms
          where ms.member_id = m.id and ms.year = v_year
            and ms.status = 'active'
        );
    else
      select count(*)::int
      into v_email_opt_in
      from public.members m
      where m.status::text = 'enrolled'
        and m.email_opt_in = true
        and exists (
          select 1 from public.memberships ms
          where ms.member_id = m.id and ms.year >= v_lapsed
        )
        and not exists (
          select 1 from public.memberships ms
          where ms.member_id = m.id and ms.year = v_year
            and ms.status in ('active', 'pending')
        );
    end if;
  else
    v_email_opt_in := null;
  end if;

  -- Search-only disabled matches (nudge)
  if v_q is not null and not v_inc_dis then
    select count(*) into v_search_disabled
    from public.members m
    where m.status::text = 'disabled'
      and (
        m.last_name ilike '%' || v_q || '%'
        or (m.first_name is not null and m.first_name ilike '%' || v_q || '%')
        or (m.secondary_first_name is not null and m.secondary_first_name ilike '%' || v_q || '%')
        or (m.secondary_last_name is not null and m.secondary_last_name ilike '%' || v_q || '%')
        or (m.primary_email is not null and m.primary_email ilike '%' || v_q || '%')
        or (m.secondary_email is not null and m.secondary_email ilike '%' || v_q || '%')
      );
  end if;

  with
  expanded as (
    select
      m.*,
      (
        select ms.tier::text
        from public.memberships ms
        where ms.member_id = m.id and ms.year = v_year
        order by
          case ms.status
            when 'active' then 0
            when 'pending' then 1
            else 2
          end,
          ms.created_at desc
        limit 1
      ) as membership_tier_for_year,
      (
        select ms.status::text
        from public.memberships ms
        where ms.member_id = m.id and ms.year = v_year
        order by
          case ms.status
            when 'active' then 0
            when 'pending' then 1
            else 2
          end,
          ms.created_at desc
        limit 1
      ) as membership_status_for_year,
      (
        select max(ms.year)::int
        from public.memberships ms
        where ms.member_id = m.id
      ) as last_active_year
    from public.members m
  ),
  filtered as (
    select *
    from expanded e
    where
      (
        v_q is null
        or (
          e.last_name ilike '%' || v_q || '%'
          or (e.first_name is not null and e.first_name ilike '%' || v_q || '%')
          or (e.secondary_first_name is not null and e.secondary_first_name ilike '%' || v_q || '%')
          or (e.secondary_last_name is not null and e.secondary_last_name ilike '%' || v_q || '%')
          or (e.primary_email is not null and e.primary_email ilike '%' || v_q || '%')
          or (e.secondary_email is not null and e.secondary_email ilike '%' || v_q || '%')
        )
      )
      and (
        v_q is not null
        or (
          case v_view
            when 'voting' then
              e.status::text <> 'disabled'
              and exists (
                select 1 from public.memberships ms
                where ms.member_id = e.id and ms.year = v_year
                  and ms.status = 'active' and ms.tier = 'voting'
              )
            when 'mailing' then
              e.status::text <> 'disabled'
              and exists (
                select 1 from public.memberships ms
                where ms.member_id = e.id and ms.year = v_year
                  and ms.status = 'active'
              )
            when 'pending' then
              e.status::text <> 'disabled'
              and exists (
                select 1 from public.memberships ms
                where ms.member_id = e.id and ms.year = v_year
                  and ms.status = 'pending'
              )
            when 'lapsed' then
              e.status::text = 'enrolled'
              and exists (
                select 1 from public.memberships ms
                where ms.member_id = e.id and ms.year >= v_lapsed
              )
              and not exists (
                select 1 from public.memberships ms
                where ms.member_id = e.id and ms.year = v_year
                  and ms.status in ('active', 'pending')
              )
            when 'incomplete' then
              e.status::text = 'new'
              and not exists (select 1 from public.memberships ms where ms.member_id = e.id)
            when 'all' then
              (v_inc_dis or e.status::text <> 'disabled')
            else false
          end
        )
      )
      and (
        v_q is null
        or (v_inc_dis or e.status::text <> 'disabled')
      )
  ),
  paged as (
    select *
    from filtered
    order by
      case when v_sort = 'last_name_asc' then last_name end asc nulls last,
      case when v_sort = 'last_name_asc' then first_name end asc nulls last,
      case when v_sort = 'last_name_desc' then last_name end desc nulls last,
      case when v_sort = 'last_name_desc' then first_name end desc nulls last,
      case when v_sort = 'created_at_desc' then created_at end desc nulls last,
      case when v_sort = 'created_at_asc' then created_at end asc nulls last
    limit greatest(coalesce(p_limit, 25), 1)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    (select count(*)::bigint from filtered),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'created_at', p.created_at,
            'first_name', p.first_name,
            'last_name', p.last_name,
            'secondary_first_name', p.secondary_first_name,
            'secondary_last_name', p.secondary_last_name,
            'primary_email', p.primary_email,
            'secondary_email', p.secondary_email,
            'email_opt_in', p.email_opt_in,
            'lake_civic_number', p.lake_civic_number,
            'lake_street_name', p.lake_street_name,
            'lake_formatted_address', p.lake_formatted_address,
            'status', p.status,
            'membership_tier_for_year', p.membership_tier_for_year,
            'membership_status_for_year', p.membership_status_for_year,
            'last_active_year', p.last_active_year,
            'since_ym', to_char(p.created_at at time zone 'utc', 'YYYY-MM')
          )
          order by
            case when v_sort = 'last_name_asc' then p.last_name end asc nulls last,
            case when v_sort = 'last_name_asc' then p.first_name end asc nulls last,
            case when v_sort = 'last_name_desc' then p.last_name end desc nulls last,
            case when v_sort = 'last_name_desc' then p.first_name end desc nulls last,
            case when v_sort = 'created_at_desc' then p.created_at end desc nulls last,
            case when v_sort = 'created_at_asc' then p.created_at end asc nulls last
        )
        from paged p
      ),
      '[]'::jsonb
    )
  into v_total, v_members;

  return jsonb_build_object(
    'members', v_members,
    'total', v_total,
    'counts', v_counts,
    'email_opt_in_count', v_email_opt_in,
    'search_disabled_matches', v_search_disabled
  );
end;
$$;

revoke all on function public.admin_member_index(text, smallint, smallint, boolean, text, text, int, int) from public;
grant execute on function public.admin_member_index(text, smallint, smallint, boolean, text, text, int, int) to service_role;

comment on function public.admin_member_index(text, smallint, smallint, boolean, text, text, int, int) is
  'Admin member directory index: named views, optional search (overrides views), pill counts. service_role only.';
