-- Remote pull had a broken literal default; normalize so inserts/COPY can omit status.
alter table public.members alter column status drop default;
alter table public.members alter column status set default 'new';
