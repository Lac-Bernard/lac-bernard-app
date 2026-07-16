# CLAUDE.md

Guidance for working in this repo. This is not a full architecture doc — it
covers conventions that aren't obvious from reading a single file.

## Database: declarative schema, not hand-written migrations

`supabase/schemas/*.sql` is the source of truth for tables and functions —
one file per function/logical unit (e.g. `admin_upgrade_membership_to_voting.sql`).
`supabase/migrations/*.sql` is generated output, not something to write by hand.

To add or change a Postgres function/table:

1. Edit/add the file in `supabase/schemas/`.
2. Make sure the local stack is running: `docker ps --filter name=supabase` or
   `supabase status`. If it's down, `supabase start`.
3. Generate the migration: `supabase db diff -f <migration_name> --local`.
   This builds a shadow DB from `supabase/schemas/*.sql` and diffs it against
   the local dev DB.
4. **Check the generated migration for missing `revoke`/`grant`/`comment`
   statements.** `supabase db diff` (migra) does not reliably emit these for
   brand-new functions. Every function in this repo follows the same
   privilege pattern — copy it in by hand if the diff omitted it:
   ```sql
   revoke all on function public.some_fn(uuid) from public;
   revoke execute on function public.some_fn(uuid) from anon, authenticated;
   grant execute on function public.some_fn(uuid) to service_role;

   comment on function public.some_fn(uuid) is 'One-line description. service_role only.';
   ```
5. Verify with `supabase db reset` (local-only; rebuilds the local dev DB
   from all migrations + seed data).

Note: `supabase migration list` says "Connecting to remote database..." —
that's just comparing migration history against the linked remote project
for status reporting. It's read-only and doesn't touch the remote schema.

## Admin RPC pattern

Admin-only Postgres functions follow a consistent shape — model new ones
after `admin_upgrade_membership_to_voting.sql` or
`admin_make_membership_complimentary.sql`:

- `SECURITY DEFINER`, `SET search_path TO 'public'`.
- `select * into <row> from <table> where id = ... for update` to lock the
  row before validating/mutating it.
- Returns `jsonb_build_object('ok', bool, 'error', code, ...)` — never
  raises for expected failure states (not found, wrong status, etc.).
- Granted to `service_role` only, revoked from everyone else (see above).

The paired API route (`src/pages/api/admin/.../[id]/*.ts`) follows the same
shape every time: `requireAdminSession`, call the RPC via
`service.rpc(...)`, map `result.error` codes to HTTP statuses, then write an
`insertAdminAudit(...)` entry on success.

## Tests: e2e only, API-driven

There is no unit or pgTAP test layer. All backend/business-logic coverage
lives in Playwright specs under `e2e/*.spec.ts`. Most tests call API routes
directly through `apiContextFor(email)` (an authenticated
`APIRequestContext`) rather than clicking through the browser UI — only a
handful of tests actually drive a `Page`. Shared helpers
(`createTestMember`, `grantAdminRole`, `serviceClient`, `apiContextFor`,
`deleteTestMember`, etc.) live in `e2e/support/testMember.ts`.

Run: `npm run test:e2e` (or `npm run test:e2e:ui`). Requires the local
Supabase stack running (`supabase start`) plus Stripe test keys in `.env`.
