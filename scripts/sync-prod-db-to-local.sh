#!/usr/bin/env bash
# Copy linked production Supabase rows (schemas public + auth) into the local Docker database.
#
# Prerequisites (once):
#   - supabase login
#   - supabase link --project-ref <prod_ref>   (from this repo root)
#   - supabase start
#
# Tooling:
#   - Supabase CLI, psql (e.g. brew install libpq), Docker
#
# Afterward: set SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY from `supabase status`
# (see README). Sign in with a local magic link (Inbucket); copied auth.users keeps app_metadata (admin).
#
# Risks:
#   - Hosted Postgres major version should match supabase/config.toml [db] major_version.
#   - Repo migrations should match production or public-schema restore can fail.
#   - Hosted GoTrue auth schema may run ahead of local Docker; we only restore auth.users
#     and auth.identities (see scripts/sanitize-prod-data-dump.py).
#   - Real PII on disk under supabase/.temp/ (gitignored). Not a full clone (no Storage files, Stripe, etc.).
#
# Usage:
#   ALLOW_SYNC_PROD_TO_LOCAL=1 npm run db:sync-prod-to-local

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${ALLOW_SYNC_PROD_TO_LOCAL:-}" != "1" ]]; then
	echo "Refusing: set ALLOW_SYNC_PROD_TO_LOCAL=1 to copy linked production data into local Supabase."
	exit 1
fi

for cmd in supabase psql python3; do
	if ! command -v "$cmd" >/dev/null 2>&1; then
		echo "Missing required command: ${cmd}"
		echo "- supabase: https://supabase.com/docs/guides/cli"
		echo "- psql: e.g. brew install libpq  (PostgreSQL client)"
		echo "- python3: required to sanitize prod auth dumps for local schema"
		exit 1
	fi
done

resolve_local_db_url() {
	local parsed=""
	parsed="$(supabase status -o env 2>/dev/null | grep '^DB_URL=' | head -1 | cut -d= -f2- | tr -d '"' || true)"
	if [[ -n "$parsed" ]]; then
		printf '%s' "$parsed"
		return 0
	fi
	printf '%s' "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
}

LOCAL_DB_URL="$(resolve_local_db_url)"

# Never restore to a remote URL: only local Supabase default port.
if [[ "$LOCAL_DB_URL" != *"127.0.0.1:54322"* && "$LOCAL_DB_URL" != *"localhost:54322"* && "$LOCAL_DB_URL" != *"[::1]:54322"* ]]; then
	echo "Refusing: local database URL must target this machine on port 54322 (from \`supabase status\`)."
	exit 1
fi

mkdir -p "$ROOT/supabase/.temp"
DUMP="$ROOT/supabase/.temp/prod-data.sql"
DUMP_SANITIZED="$ROOT/supabase/.temp/prod-data-sanitized.sql"

echo "Resetting local database (migrations, no seed)…"
supabase db reset --local --no-seed --yes

echo "Dumping production data (linked project, schemas public + auth)…"
if ! supabase db dump --linked --data-only --use-copy -s public,auth -f "$DUMP"; then
	echo "Hint: run \`supabase login\` and \`supabase link --project-ref <your_prod_ref>\` from the repo root."
	exit 1
fi

echo "Sanitizing dump for local auth schema (keep auth.users + auth.identities only)…"
python3 "$ROOT/scripts/sanitize-prod-data-dump.py" "$DUMP" "$DUMP_SANITIZED"

echo "Restoring into local Postgres…"
psql \
	--variable ON_ERROR_STOP=1 \
	--single-transaction \
	--dbname "$LOCAL_DB_URL" \
	-c 'SET session_replication_role = replica' \
	-f "$DUMP_SANITIZED" \
	-c 'SET session_replication_role = DEFAULT'

echo "Done. Dump file: ${DUMP}"
echo "Update .env from \`supabase status\` for local SUPABASE_URL and keys, then sign in via magic link (Inbucket)."
