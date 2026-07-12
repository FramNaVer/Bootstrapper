# ADR-0003: Shared dev/prod database → expand–contract migrations only

**Status:** Accepted · 2026-06

## Context

Development and production run against the **same Neon PostgreSQL database** (free-tier constraint). `prisma migrate dev` on a developer machine applies schema changes to the database that production code is actively reading — there is no staging buffer.

## Decision

Every migration must be **expand-contract safe**: only additive changes (new tables, new nullable columns, new indexes) may ship while old code still runs. Renames and drops are forbidden until no deployed code references the old shape.

Practical rules:

1. New columns are nullable or defaulted; new tables and indexes are always safe.
2. Never rename — write new data into the existing column (e.g. token hashes reused the `token` column) or add a new column and backfill.
3. Contract (drop/rename) only *after* a deploy where nothing reads the old shape — and treat it as its own migration.

## Consequences

- Deploys and migrations are decoupled; a migration can land hours before the code that uses it.
- Some schema ugliness persists (a column named `token` holds hashes). Documented where it happens.
- If the project outgrows this, the exit is a separate prod database + `prisma migrate deploy` in CI — the additive discipline learned here still applies (it is the standard for zero-downtime migrations anyway).
