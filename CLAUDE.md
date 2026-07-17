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

`supabase/seed.sql` is also generated output, not hand-written — it's
produced by `scripts/generate-dummy-seeds.mjs` (`npm run db:seed`). Edit
the generator, not the SQL file directly; regenerate and let `supabase db
reset` apply it. Local-only — never applied to hosted/remote projects.

## Admin identity: `app_metadata.role`, not a table

There is no `public.admins` table or `roles` column. Admin status lives
entirely in Supabase Auth's `app_metadata.role` on the `auth.users` row,
checked by `isAppAdmin()` in `src/lib/auth/admin.ts` (also accepts
`app_metadata.admin === true` / `user_metadata.admin === true`). Grant it
with `supabase.auth.admin.updateUserById(id, { app_metadata: { role: 'admin' } })`
— see `scripts/grant-admin-dev.mjs` (`npm run dev:grant-admin -- <email>`)
or `grantAdminRole()` in `e2e/support/testMember.ts`. After granting, the
user must sign out/in (or refresh session) so the JWT picks up the change.

`supabase/seed.sql` pre-seeds `DEV_ADMIN_EMAIL` (from `.env`) as a
confirmed `auth.users` row with `app_metadata.role: admin`; signing in via
Google with that same email auto-links to it (Supabase Auth's identity
linking), so that account is already an admin right after `supabase db
reset` — no manual grant needed.

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

## Admin member index named views

The admin members tab (`AdminMembershipView.astro` + `admin-member-index.ts`,
served by `GET /api/admin/members?view=...`) has a fixed set of named views
("voting", "pending", "lapsed", etc.) implemented as one `case v_view when
...` branch per view inside the single Postgres function
`admin_member_index` (`supabase/schemas/admin_member_index.sql`) — not
separate functions or query-param filter composition.

Adding a new named view means touching the view-name list/union in **all**
of these places, or it silently 400s or falls back to the default view:

- `supabase/schemas/admin_member_index.sql`: the `v_view not in (...)`
  guard, a new CTE for the pill count, and a new `when '<view>' then ...`
  branch in the row filter (counts and row-filter logic are separate blocks
  that must both be updated). Generate the migration the normal way (see
  above) — model the migration on
  `supabase/migrations/20260705150000_admin_member_index_associate_view.sql`,
  which replaces the whole function body.
- `src/lib/admin/memberIndexParams.ts`: `AdminMemberIndexView` union +
  `isView()`.
- `src/scripts/admin-member-index.ts`: `MemberIndexView` union, the
  `readUrlState()` literal check, the `views` array that renders pills,
  `viewLabel()`, `metaLeftHtml()`, and `showEmptyState()`.
- `src/lib/members/i18n.ts`: add `adminView<Name>`,
  `adminMemberIndexMeta<Name>`, and `adminEmpty<Name>` keys to the type
  block and to both the `en` and `fr` string tables.
- `src/components/members/AdminMembershipView.astro`: add the new i18n keys
  to the `adminKeys` array passed from Astro to the client script (strings
  silently render as their raw key if forgotten here).

When a view needs to dedupe on lake address, use
`normalize_lake_address_key(lake_civic_number, lake_street_name)` (also used
by voting-eligibility checks) rather than comparing `lake_formatted_address`
— it's the one key that already treats Google-Places-entered and
manually-entered addresses as equivalent.

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
