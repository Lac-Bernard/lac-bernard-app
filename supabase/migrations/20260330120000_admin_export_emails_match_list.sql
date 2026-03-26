-- Export uses the same member set as the admin list; only require a non-empty primary email.
-- (Previously excluded email_opt_in / inactive, which hid rows that still appeared in the table.)

create or replace function public.admin_members_export_emails(
  p_year smallint,
  p_membership text,
  p_tier text,
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
  r text;
begin
  if v_ms not in ('active', 'not_active') then
    return '';
  end if;

  if v_tier not in ('all', 'general', 'associate') then
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
      and m.primary_email is not null
      and length(trim(m.primary_email)) > 0
    group by lower(trim(m.primary_email))
  ) x;

  return coalesce(r, '');
end;
$$;

revoke all on function public.admin_members_export_emails(smallint, text, text, text) from public;
grant execute on function public.admin_members_export_emails(smallint, text, text, text) to service_role;

comment on function public.admin_members_export_emails(smallint, text, text, text) is
  'Comma-separated primary emails for same filters as admin_members_page; requires non-empty primary email. service_role only.';

create or replace function public.admin_pending_members_export_emails()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
begin
  select string_agg(x.pe, ',' order by x.pe)
  into r
  from (
    select min(trim(m.primary_email)) as pe
    from public.memberships ms
    join public.members m on m.id = ms.member_id
    where ms.status = 'pending'
      and m.primary_email is not null
      and length(trim(m.primary_email)) > 0
    group by lower(trim(m.primary_email))
  ) x;

  return coalesce(r, '');
end;
$$;

revoke all on function public.admin_pending_members_export_emails() from public;
grant execute on function public.admin_pending_members_export_emails() to service_role;

comment on function public.admin_pending_members_export_emails() is
  'Comma-separated primary emails for pending memberships; requires non-empty primary email. service_role only.';
