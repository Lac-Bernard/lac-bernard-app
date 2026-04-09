-- Member directory status: new → enrolled (auto on first membership activation), disabled unchanged.
-- Replaces verified with enrolled; transition new → enrolled when a membership becomes active.

update public.members set status = 'enrolled' where status = 'verified';

alter table public.members drop constraint if exists members_status_check;
alter table public.members
  add constraint members_status_check check (status in ('new', 'enrolled', 'disabled'));

comment on column public.members.status is
  'Member record lifecycle: new (no activation yet), enrolled (directory/comms; at least one membership activated or backfilled), disabled (excluded from default directory and exports).';

-- When a membership becomes active, move member profile off "new" without admin action.
create or replace function public.memberships_on_active_enroll_member()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    update public.members
    set status = 'enrolled'
    where id = new.member_id
      and status = 'new';
  end if;
  return new;
end;
$$;

drop trigger if exists memberships_on_active_enroll_member on public.memberships;

create trigger memberships_on_active_enroll_member
  after insert or update of status
  on public.memberships
  for each row
  execute function public.memberships_on_active_enroll_member();

comment on function public.memberships_on_active_enroll_member() is
  'After membership becomes active: set members.status from new to enrolled.';

-- admin_members_page / admin_members_export_emails: default and filter value verified → enrolled.

create or replace function public.admin_members_page(
  p_year smallint,
  p_membership text,
  p_tier text,
  p_member_status text,
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
  v_ms text := coalesce(nullif(trim(p_membership), ''), 'active');
  v_tier text := coalesce(nullif(trim(p_tier), ''), 'all');
  v_sort text := coalesce(nullif(trim(p_sort), ''), 'created_at_desc');
  v_mem_st text := lower(coalesce(nullif(trim(p_member_status), ''), 'enrolled'));
begin
  if v_ms not in ('active', 'not_active', 'all', 'has_membership_history') then
    return jsonb_build_object('error', 'invalid_membership_filter', 'members', '[]'::jsonb, 'total', 0);
  end if;

  if v_tier not in ('all', 'voting', 'associate') then
    return jsonb_build_object('error', 'invalid_tier_filter', 'members', '[]'::jsonb, 'total', 0);
  end if;

  if v_mem_st not in ('enrolled', 'new', 'disabled', 'all') then
    return jsonb_build_object('error', 'invalid_member_status_filter', 'members', '[]'::jsonb, 'total', 0);
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
        (
          v_ms = 'active'
          and exists (
            select 1
            from public.memberships ms
            where ms.member_id = m.id
              and ms.year = p_year
              and ms.status = 'active'
              and (v_tier = 'all' or ms.tier::text = v_tier)
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
          and (
            v_tier = 'all'
            or (
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
            ) is not distinct from v_tier
          )
        )
        or (
          v_ms = 'all'
          and (
            v_tier = 'all'
            or (
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
            ) is not distinct from v_tier
          )
        )
        or (
          v_ms = 'has_membership_history'
          and exists (
            select 1
            from public.memberships ms
            where ms.member_id = m.id
          )
          and (
            v_tier = 'all'
            or (
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
            ) is not distinct from v_tier
          )
        )
      )
      and (v_mem_st = 'all' or m.status::text = v_mem_st)
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

create or replace function public.admin_members_export_emails(
  p_year smallint,
  p_membership text,
  p_tier text,
  p_member_status text,
  p_q text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ms text := coalesce(nullif(trim(p_membership), ''), 'active');
  v_tier text := coalesce(nullif(trim(p_tier), ''), 'all');
  v_mem_st text := lower(coalesce(nullif(trim(p_member_status), ''), 'enrolled'));
  r text;
begin
  if v_ms not in ('active', 'not_active', 'all', 'has_membership_history') then
    return '';
  end if;

  if v_tier not in ('all', 'voting', 'associate') then
    return '';
  end if;

  if v_mem_st not in ('enrolled', 'new', 'disabled', 'all') then
    return '';
  end if;

  select string_agg(x.pe, ',' order by x.pe)
  into r
  from (
    select min(trim(m.primary_email)) as pe
    from public.members m
    where
      (
        (
          v_ms = 'active'
          and exists (
            select 1
            from public.memberships ms
            where ms.member_id = m.id
              and ms.year = p_year
              and ms.status = 'active'
              and (v_tier = 'all' or ms.tier::text = v_tier)
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
          and (
            v_tier = 'all'
            or (
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
            ) is not distinct from v_tier
          )
        )
        or (
          v_ms = 'all'
          and (
            v_tier = 'all'
            or (
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
            ) is not distinct from v_tier
          )
        )
        or (
          v_ms = 'has_membership_history'
          and exists (
            select 1
            from public.memberships ms
            where ms.member_id = m.id
          )
          and (
            v_tier = 'all'
            or (
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
            ) is not distinct from v_tier
          )
        )
      )
      and (v_mem_st = 'all' or m.status::text = v_mem_st)
      and (
        p_q is null
        or length(trim(p_q)) = 0
        or m.last_name ilike '%' || trim(p_q) || '%'
        or m.first_name ilike '%' || trim(p_q) || '%'
        or m.primary_email ilike '%' || trim(p_q) || '%'
        or (m.secondary_email is not null and m.secondary_email ilike '%' || trim(p_q) || '%')
      )
      and m.primary_email is not null
      and length(trim(m.primary_email)) > 0
    group by lower(trim(m.primary_email))
  ) x;

  return coalesce(r, '');
end;
$$;

-- Daily summary: member profiles created previous Toronto day (not status = new count).
create or replace function public.admin_daily_membership_summary()
returns jsonb
language sql
volatile
security definer
set search_path = public
as $$
  with toronto_today as (
    select (now() at time zone 'America/Toronto')::date as d
  ),
  toronto_yesterday as (
    select (d - 1)::date as d from toronto_today
  )
  select jsonb_build_object(
    'pending_memberships',
    (select count(*)::int from public.memberships where status = 'pending'),
    'member_records_created_previous_toronto_day',
    (
      select count(*)::int
      from public.members mb
      cross join toronto_yesterday y
      where (mb.created_at at time zone 'America/Toronto')::date = y.d
    ),
    'memberships_activated_previous_toronto_day',
    (
      select count(*)::int
      from public.memberships m
      cross join toronto_yesterday y
      where m.status = 'active'
        and m.activated_at is not null
        and (m.activated_at at time zone 'America/Toronto')::date = y.d
    ),
    'toronto_report_date',
    (select d::text from toronto_today),
    'toronto_previous_date_for_activations',
    (select d::text from toronto_yesterday)
  );
$$;

comment on function public.admin_daily_membership_summary() is
  'Snapshot counts for daily membership admin email. service_role only.';
