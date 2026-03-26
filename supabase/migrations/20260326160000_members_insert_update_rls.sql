-- Allow authenticated users to create their own member row (join) and update it (edit).

drop policy if exists "members_insert_own" on public.members;

create policy "members_insert_own"
on public.members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and primary_email is not null
  and lower(trim(primary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
);

drop policy if exists "members_update_own" on public.members;

create policy "members_update_own"
on public.members
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and lower(trim(primary_email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
);
