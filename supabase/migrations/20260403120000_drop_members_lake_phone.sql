-- Remove lake/cottage phone from member profiles (no longer collected or synced).
alter table public.members drop column if exists lake_phone;
