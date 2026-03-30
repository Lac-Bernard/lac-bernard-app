"""
Import the master membership spreadsheet (exported as CSV) into Supabase.

The CSV is not stored in this repo — pass the path when you run the script.

Name columns: Last Name → last_name; Other LName → other_last_name (not merged into last_name).
First Name is split on the first `` & ``, `` / ``, or `` and `` into first_name / other_first_name.

Imports align with the current schema (tier fees, payment split, membership status):
  payments.amount = membership_amount + donation_amount; donation_amount is 0 for these rows.
  Tier fees: general $75, associate $25 (same as membership_tier_fee_amount / Stripe checkout).
  Payment/membership created_at and payment date: Jan 1 (America/Toronto) of
  min(membership_year, current_year) so prepaid future years do not sort above
  current activity in the admin UI. Actual membership year stays on memberships.year.
  Payment notes mark legacy import (and prepaid-for year when applicable).

Prerequisites (use a venv — system Python often blocks global pip; see README):
  python3 -m venv .venv && .venv/bin/pip install -r scripts/requirements-membership-import.txt
  npm run db:import-members-csv:local -- ./sheet.csv   # uses .venv via scripts/run-membership-import.sh

Environment (same as other scripts — see .env.example):
  SUPABASE_URL=…
  SUPABASE_SERVICE_ROLE_KEY=…   (service role; never commit)

Local stack (Docker): use --local to read URL + service role from `supabase status` (run `supabase start` first), or put the same values in `.env`.

Usage:
  python scripts/generate_supabase_csvs.py <path-to-master.csv>
  python scripts/generate_supabase_csvs.py <path-to-master.csv> --reset
  python scripts/generate_supabase_csvs.py --local <path-to-master.csv> [--reset]

Or via npm — **npm requires `--` before script flags**:
  npm run db:import-members-csv -- --reset /path/to/Master_Membership_List.csv
  (Wrong: `npm run db:import-members-csv --reset file.csv` — npm eats `--reset` and the import runs without wiping.)

`--reset` here deletes all rows in payments, memberships, and members. That is broader than
`scripts/generate-dummy-seeds.mjs --apply --reset`, which only removes dummy-seed–tagged rows.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import uuid
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd
from dotenv import load_dotenv

# Must match public.membership_tier_fee_amount / MEMBERSHIP_TIER_CENTS (src/lib/membership/stripeCheckout.ts).
TIER_FEE_DOLLARS = {"general": 75, "associate": 25}

TZ = ZoneInfo("America/Toronto")

_root = Path(__file__).resolve().parent.parent

# -- Config -------------------------------------------------------------------

BATCH_SIZE = 500  # rows per insert call

# Year columns: (year, paid_col, method_col, type_col)
YEAR_COLS = [
    (2020, "Paid?",   "Payment Method",   "Membership Type"),
    (2021, "Paid?.1", "Payment Method.1", "Membership Type.1"),
    (2022, "Paid?.2", "Payment Method.2", "Membership Type.2"),
    (2023, "Paid?.3", "Payment Method.3", "Membership Type.3"),
    (2024, "Paid?.4", "Payment Method.4", "Membership Type.4"),
    (2025, "Paid?.5", "Payment Method.5", "Membership Type.5"),
    (2026, "Paid?.6", "Payment Method.6", "Membership Type.6"),
    (2027, "Paid?.7", "Payment Method.7", "Membership Type.7"),
    (2028, "Paid",    "Payment Method.8", "Membersihip Type"),  # typo in source
]

METHOD_MAP = {
    "interact e-transfer": "e-transfer",
    "cheque":              "cheque",
    "cash":                "cash",
    "stripe":              "stripe",
}

TIER_MAP = {
    "voting member":    "general",
    "associate member": "associate",
}

IMPORT_PAYMENT_NOTE_BASE = (
    "Imported from legacy membership spreadsheet; dates are approximate."
)

# -- Helpers ------------------------------------------------------------------


def new_uuid() -> str:
    return str(uuid.uuid4())


def primary_last_name(row) -> str:
    """Lead surname from the Last Name column (not concatenated with Other LName)."""
    return str(row["Last Name"]).strip()


def parse_other_last_name(row) -> str | None:
    """Maps CSV Other LName → other_last_name; empty cells → None."""
    other = row.get("Other LName")
    if pd.isna(other):
        return None
    t = str(other).strip()
    return t if t else None


# First delimiter wins (left = primary first name, right = co-listed first name).
# Order: ` & `, ` / `, word-boundary ` and ` (case-insensitive). Only one split; if the cell
# contains three or more names, everything after the first delimiter stays in other_first_name.
_FIRST_NAME_SPLIT = re.compile(r"\s+&\s+|\s+/\s+|\s+and\s+", re.IGNORECASE)


def parse_first_name_cell(raw) -> tuple[str | None, str | None]:
    """
    Split legacy "First Name" into first_name + other_first_name.

    Uses the first match of `` & ``, `` / ``, or `` and `` (case-insensitive). If there is
    no delimiter, the whole cell is primary. Remainder after the first split is other_first_name
    (may contain additional delimiters; re-import or manual cleanup if needed).
    """
    if pd.isna(raw):
        return None, None
    s = str(raw).strip()
    if not s:
        return None, None
    m = _FIRST_NAME_SPLIT.search(s)
    if not m:
        return s, None
    left = s[: m.start()].strip()
    right = s[m.end() :].strip()
    if not left and not right:
        return None, None
    if not left:
        return right, None
    if not right:
        return left, None
    return left, right


def normalize_method(raw) -> str:
    if pd.isna(raw):
        return "unknown"
    return METHOD_MAP.get(str(raw).strip().lower(), "unknown")


def normalize_tier(raw) -> str | None:
    if pd.isna(raw):
        return None
    return TIER_MAP.get(str(raw).strip().lower(), None)


def jan1_iso_timestamp(year: int) -> str:
    """Midnight Jan 1 in America/Toronto for this calendar year (timestamptz for Postgres)."""
    return datetime(year, 1, 1, 0, 0, 0, tzinfo=TZ).isoformat()


def jan1_date(year: int) -> str:
    """ISO date string for Jan 1 (payments.date column)."""
    return f"{year:04d}-01-01"


def cap_year_for_synthetic_timestamps(membership_year: int, current_year: int) -> int:
    """
    Jan 1 used for payment date / created_at and related rows: min(membership_year, current_year).
    Prepaid dues for a future membership year should not sort above current-year payments in admin.
    """
    return min(membership_year, current_year)


def import_payment_notes(membership_year: int, current_year: int) -> str:
    """Notes on imported payment rows; clarifies prepaid future years."""
    base = IMPORT_PAYMENT_NOTE_BASE
    if membership_year > current_year:
        return f"{base} Prepaid for membership year {membership_year}."
    return base


def parse_year_joined_cell(raw) -> int | None:
    """Best-effort parse of 'Year joined' when a member has no membership rows."""
    if pd.isna(raw):
        return None
    s = str(raw).strip()
    if not s:
        return None
    m = re.match(r"^(\d{4})\b", s)
    if m:
        return int(m.group(1))
    return None


def parse_env_lines(text: str) -> dict[str, str]:
    """Parse KEY=value lines (e.g. `supabase status -o env` stdout)."""
    out: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, _, v = line.partition("=")
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k:
            out[k] = v
    return out


def _run_supabase_status(args: list[str]) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            ["supabase", *args],
            cwd=str(_root),
            capture_output=True,
            text=True,
            timeout=90,
        )
    except FileNotFoundError as e:
        raise RuntimeError(
            "Could not find the `supabase` CLI on your PATH. Install it from "
            "https://supabase.com/docs/guides/cli — or omit --local and set "
            "SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env."
        ) from e


def apply_local_supabase_from_cli() -> None:
    """
    Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from `supabase status` (local Docker stack).
    """
    r = _run_supabase_status(["status", "-o", "env"])
    env = parse_env_lines(r.stdout) if r.returncode == 0 else {}
    url = env.get("SUPABASE_URL") or env.get("API_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SERVICE_ROLE_KEY")

    if not url or not key:
        r2 = _run_supabase_status(["status", "--output", "json"])
        if r2.returncode != 0:
            err = (r.stderr or r.stdout or r2.stderr or r2.stdout or "").strip()
            hint = (
                "Could not read local Supabase credentials.\n"
                "- Install the Supabase CLI and start the stack: `supabase start` from the repo root.\n"
                "- Or omit --local and set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.\n"
            )
            raise RuntimeError(f"{hint}\n{err}" if err else hint)

        try:
            data = json.loads(r2.stdout)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Could not parse `supabase status --output json`: {e}") from e

        if isinstance(data, dict):
            url = url or data.get("API_URL") or data.get("SUPABASE_URL")
            key = key or data.get("SERVICE_ROLE_KEY") or data.get("SUPABASE_SERVICE_ROLE_KEY")
            auth = data.get("auth") if isinstance(data.get("auth"), dict) else None
            if auth and not key:
                key = auth.get("service_role_key") or auth.get("service_role")
            api = data.get("api") if isinstance(data.get("api"), dict) else None
            if api and not url:
                url = api.get("url")

    if not url or not key:
        raise RuntimeError(
            "Could not find API URL or service role key from `supabase status`. "
            "Update scripts/generate_supabase_csvs.py if the CLI output format changed."
        )

    os.environ["SUPABASE_URL"] = url
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = key


def resolve_supabase_credentials() -> tuple[str, str]:
    """Service role key: SUPABASE_SERVICE_ROLE_KEY preferred; SUPABASE_KEY supported for older setups."""
    url = (os.getenv("SUPABASE_URL") or "").strip()
    key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or "").strip()
    return url, key


def load_project_env() -> None:
    load_dotenv(_root / ".env")


def _table_count(supabase, table: str) -> int | None:
    """Exact row count via PostgREST (None if unavailable)."""
    try:
        from postgrest.types import CountMethod

        r = supabase.table(table).select("*", count=CountMethod.exact, head=True).execute()
        return r.count
    except Exception:
        return None


def _delete_all_rows(supabase, table: str) -> None:
    """Delete every row (id IS NOT NULL). Same idea as clear-memberships-dev.mjs."""
    supabase.table(table).delete().not_.is_("id", None).execute()


def batch_insert(supabase, table: str, rows: list[dict]):
    """Insert rows in batches, with progress output."""
    total = len(rows)
    for i in range(0, total, BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        supabase.table(table).insert(batch).execute()
        end = min(i + BATCH_SIZE, total)
        print(f"   {table}: inserted {end}/{total}")


# -- Main ---------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import master membership CSV into Supabase (dev / one-off)."
    )
    parser.add_argument(
        "csv_path",
        type=Path,
        help="Path to the exported master membership CSV (not committed to the repo).",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing rows in payments, memberships, and members before insert.",
    )
    parser.add_argument(
        "--local",
        action="store_true",
        help="Use the local Supabase stack: URL and service role from `supabase status` (after `supabase start`).",
    )
    args = parser.parse_args()

    input_path = args.csv_path
    if not input_path.is_file():
        print(f"Error: file not found: {input_path.resolve()}", file=sys.stderr)
        sys.exit(1)

    load_project_env()
    if args.local:
        try:
            apply_local_supabase_from_cli()
        except RuntimeError as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
        print("Using local Supabase from `supabase status`.\n")

    supabase_url, service_key = resolve_supabase_credentials()
    if not supabase_url or not service_key:
        print(
            "Error: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env, "
            "or pass --local with `supabase start` running.",
            file=sys.stderr,
        )
        sys.exit(1)

    from supabase import create_client

    supabase = create_client(supabase_url, service_key)

    if args.reset:
        from postgrest.exceptions import APIError

        print("Resetting tables (delete order: payments -> memberships -> members)...")
        try:
            before_p = _table_count(supabase, "payments")
            before_ms = _table_count(supabase, "memberships")
            before_m = _table_count(supabase, "members")
            if before_p is not None and before_ms is not None and before_m is not None:
                print(
                    f"   Before: payments={before_p}, memberships={before_ms}, members={before_m}"
                )

            _delete_all_rows(supabase, "payments")
            _delete_all_rows(supabase, "memberships")
            _delete_all_rows(supabase, "members")

            after_p = _table_count(supabase, "payments")
            after_ms = _table_count(supabase, "memberships")
            after_m = _table_count(supabase, "members")
            if after_p is not None and after_ms is not None and after_m is not None:
                print(
                    f"   After:  payments={after_p}, memberships={after_ms}, members={after_m} (expect 0 / 0 / 0)"
                )
                if after_p != 0 or after_ms != 0 or after_m != 0:
                    print(
                        "   Warning: counts are not zero — check SUPABASE_SERVICE_ROLE_KEY (not the anon key).",
                        file=sys.stderr,
                    )
            print("  Tables cleared.\n")
        except APIError as e:
            print(
                f"Reset failed: {getattr(e, 'message', None) or e}. "
                "Use SUPABASE_SERVICE_ROLE_KEY (not the anon key).",
                file=sys.stderr,
            )
            sys.exit(1)

    print(f"Reading: {input_path}")
    raw = pd.read_csv(input_path, header=0, skiprows=[0], dtype=str)
    df  = raw[raw["Last Name"].notna() & (raw["Last Name"].str.strip() != "")].copy()
    print(f"  -> {len(df)} member rows found\n")

    members_rows = []
    membership_rows = []
    payment_rows = []

    current_year = datetime.now(TZ).year

    for _, row in df.iterrows():
        member_id = new_uuid()

        mem_details: list[tuple[int, str, bool, object]] = []
        for (year, paid_col, method_col, type_col) in YEAR_COLS:
            paid_val = row.get(paid_col)
            method_val = row.get(method_col)
            type_val = row.get(type_col)

            if pd.isna(paid_val) and pd.isna(type_val):
                continue

            tier = normalize_tier(type_val)
            if tier is None:
                continue

            is_paid = str(paid_val).strip().lower() == "paid"
            mem_details.append((year, tier, is_paid, method_val))

        first_membership_year = min(y for y, _, _, _ in mem_details) if mem_details else None
        member_created_at: str | None = None
        if first_membership_year is not None:
            member_created_at = jan1_iso_timestamp(
                cap_year_for_synthetic_timestamps(first_membership_year, current_year)
            )
        else:
            yj = parse_year_joined_cell(row.get("Year joined"))
            if yj is not None:
                member_created_at = jan1_iso_timestamp(
                    cap_year_for_synthetic_timestamps(yj, current_year)
                )

        _email_raw = str(row["E-mail address"]).strip() if pd.notna(row["E-mail address"]) else ""
        primary_email = _email_raw if _email_raw else None

        status = "disabled" if str(row.get("Inactive?", "")).strip().lower() == "inactive" else "verified"

        fn_primary, fn_other = parse_first_name_cell(row.get("First Name"))

        member_record: dict = {
            "id": member_id,
            "first_name": fn_primary,
            "other_first_name": fn_other,
            "last_name": primary_last_name(row),
            "other_last_name": parse_other_last_name(row),
            "primary_email": primary_email,
            "status": status,
            "secondary_email": str(row["Email 2 Address"]).strip() if pd.notna(row["Email 2 Address"]) else None,
            "primary_phone": str(row["Phone1"]).strip() if pd.notna(row["Phone1"]) else None,
            "secondary_phone": str(row["Phone2"]).strip() if pd.notna(row["Phone2"]) else None,
            "lake_phone": str(row["CottageTel"]).strip() if pd.notna(row["CottageTel"]) else None,
            "lake_civic_number": str(row["Civic"]).strip() if pd.notna(row["Civic"]) else None,
            "lake_street_name": str(row["Road"]).strip() if pd.notna(row["Road"]) else None,
            "primary_address": str(row["Main Address"]).strip() if pd.notna(row["Main Address"]) else None,
            "primary_city": str(row["City"]).strip() if pd.notna(row["City"]) else None,
            "primary_province": str(row["Pro"]).strip() if pd.notna(row["Pro"]) else None,
            "primary_country": str(row["CO"]).strip() if pd.notna(row["CO"]) else None,
            "primary_postal_code": str(row["Post code"]).strip() if pd.notna(row["Post code"]) else None,
            "email_opt_in": str(row["Email List?"]).strip().lower() == "yes"
            if pd.notna(row["Email List?"])
            else False,
            "notes": str(row["Comments"]).strip() if pd.notna(row["Comments"]) else None,
            "_source_index": row.name,
        }
        if member_created_at is not None:
            member_record["created_at"] = member_created_at
        members_rows.append(member_record)

        for year, tier, is_paid, method_val in mem_details:
            membership_id = new_uuid()
            fee = TIER_FEE_DOLLARS[tier]
            ts_year = cap_year_for_synthetic_timestamps(year, current_year)

            membership_rows.append(
                {
                    "id": membership_id,
                    "member_id": member_id,
                    "year": year,
                    "tier": tier,
                    "status": "active" if is_paid else "pending",
                    "created_at": jan1_iso_timestamp(ts_year),
                }
            )

            if is_paid:
                payment_rows.append(
                    {
                        "membership_id": membership_id,
                        "method": normalize_method(method_val),
                        "amount": fee,
                        "membership_amount": fee,
                        "donation_amount": 0,
                        "date": jan1_date(ts_year),
                        "notes": import_payment_notes(year, current_year),
                        "payment_id": None,
                        "created_at": jan1_iso_timestamp(ts_year),
                    }
                )

    members_clean = [{k: v for k, v in r.items() if k != "_source_index"} for r in members_rows]

    print("Uploading to Supabase...")
    batch_insert(supabase, "members",     members_clean)
    batch_insert(supabase, "memberships", membership_rows)
    batch_insert(supabase, "payments",    payment_rows)

    print()
    print("Done!")
    print(f"   members:      {len(members_clean):>4} rows")
    print(f"   memberships:  {len(membership_rows):>4} rows")
    print(f"   payments:     {len(payment_rows):>4} rows")

    no_email = [r for r in members_clean if r["primary_email"] is None]
    if no_email:
        print()
        print(f"Warning: {len(no_email)} member(s) had no email - stored as NULL:")
        for r in no_email:
            print(f"   - {r['first_name']} {r['last_name']}")

    unknown_method = [r for r in payment_rows if r["method"] == "unknown"]
    if unknown_method:
        print()
        print(f"Warning: {len(unknown_method)} payment(s) had no recognised method - set to 'unknown'.")


if __name__ == "__main__":
    main()
