-- Members no longer store "primary" home address fields (UI removed; exports/imports removed).
alter table public.members
  drop column if exists primary_address,
  drop column if exists primary_city,
  drop column if exists primary_province,
  drop column if exists primary_country,
  drop column if exists primary_postal_code;

