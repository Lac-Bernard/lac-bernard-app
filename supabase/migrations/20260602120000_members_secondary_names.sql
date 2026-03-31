-- Rename co-listed second-person fields to the shared secondary_* convention.
alter table public.members
  rename column other_first_name to secondary_first_name;

alter table public.members
  rename column other_last_name to secondary_last_name;

comment on column public.members.secondary_first_name is
  'Second given name when the source sheet lists two people in First Name (e.g. after & or and).';

comment on column public.members.secondary_last_name is
  'Maps from legacy Other LName; second surname for the co-listed person.';
