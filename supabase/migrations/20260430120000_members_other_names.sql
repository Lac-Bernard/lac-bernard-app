-- Co-listed person on the same membership row (legacy sheet: split First Name, Other LName).
alter table public.members
  add column if not exists other_first_name text,
  add column if not exists other_last_name text;

comment on column public.members.other_first_name is
  'Second given name when the source sheet lists two people in First Name (e.g. after & or and).';
comment on column public.members.other_last_name is
  'Maps from legacy Other LName; second surname for the co-listed person.';
