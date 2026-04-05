-- Lake address metadata from Google Places (optional) + manual fallback.
alter table public.members
  add column if not exists lake_address_source text;

alter table public.members
  add constraint members_lake_address_source_check
  check (
    lake_address_source is null
    or lake_address_source in ('places', 'manual')
  );

comment on column public.members.lake_address_source is
  'How lake civic/street were set: places (Google Places) or manual.';

alter table public.members
  add column if not exists lake_google_place_id text;

comment on column public.members.lake_google_place_id is
  'Google Place ID when lake_address_source = places; not used for voting key.';

alter table public.members
  add column if not exists lake_formatted_address text;

comment on column public.members.lake_formatted_address is
  'Display line from Places formattedAddress or concatenated manual civic + street.';
