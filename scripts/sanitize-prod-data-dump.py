#!/usr/bin/env python3
"""Prepare a prod data-only dump for restore into local Supabase.

Hosted GoTrue auth schema often runs ahead of local Docker images. A full auth
dump includes ephemeral tables (flow_state, sessions, …) and prod-only columns
(e.g. custom_oauth_providers.custom_claims_allowlist). For local dev we only
need auth.users (emails, app_metadata) and auth.identities (OAuth links).
"""

from __future__ import annotations

import re
import sys

AUTH_KEEP = frozenset({"users", "identities"})
COPY_AUTH_RE = re.compile(r'^COPY "auth"\."([^"]+)"')


def sanitize(src: str, dst: str) -> None:
    skipped: list[str] = []
    kept_auth: list[str] = []

    with open(src, encoding="utf-8") as infile, open(dst, "w", encoding="utf-8") as outfile:
        in_copy = False
        skip_copy = False

        for line in infile:
            if not in_copy:
                match = COPY_AUTH_RE.match(line)
                if match and line.rstrip().endswith("FROM stdin;"):
                    auth_table = match.group(1)
                    in_copy = True
                    if auth_table in AUTH_KEEP:
                        skip_copy = False
                        kept_auth.append(auth_table)
                        outfile.write(line)
                    else:
                        skip_copy = True
                        skipped.append(auth_table)
                        outfile.write(
                            f"-- [sync-prod-to-local] skipped auth.{auth_table} "
                            "(not needed locally; avoids auth schema drift)\n"
                        )
                else:
                    outfile.write(line)
            elif line.rstrip() == r"\.":
                if not skip_copy:
                    outfile.write(line)
                in_copy = False
                skip_copy = False
            elif not skip_copy:
                outfile.write(line)

    print(f"Sanitized auth COPY blocks: kept {', '.join(kept_auth) or '(none)'}")
    if skipped:
        print(f"Skipped auth tables: {', '.join(skipped)}")


def main() -> None:
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.sql> <output.sql>", file=sys.stderr)
        sys.exit(1)
    sanitize(sys.argv[1], sys.argv[2])


if __name__ == "__main__":
    main()
