#!/usr/bin/env bash
# Prefer project venv so `npm run db:import-members-csv` works without activating it.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -x "$ROOT/.venv/bin/python3" ]]; then
  exec "$ROOT/.venv/bin/python3" "$ROOT/scripts/generate_supabase_csvs.py" "$@"
fi
exec python3 "$ROOT/scripts/generate_supabase_csvs.py" "$@"
