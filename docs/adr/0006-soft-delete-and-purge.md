# ADR-0006: Soft delete with nightly purge cron

**Status:** Accepted · 2026-07

## Context

Boards, lists, cards, and comments are user content — accidental deletion should be recoverable, and a future trash/undo UI needs the data to still exist. But soft-deleted rows accumulate forever, and some tables (tokens, old notifications, closed invitations) grow without any user-facing value.

## Decision

- Content tables carry `deletedAt`; every read query filters `deletedAt: null`. Deleting a parent flags the parent only (deleting a *list* flags its cards explicitly; a *board* deletion relies on query-time filtering through the relation — org-level queries must filter `board: { deletedAt: null }`).
- A **nightly cron** (`node-cron`, `0 20 * * *` UTC = 03:00 ICT, plus a boot-time run) hard-deletes, child-first:
  - soft-deleted content older than **30 days** (comments → cards → lists → boards)
  - **expired** refresh tokens — *revoked-but-unexpired tokens are kept*: they are the reuse-detection tripwire (ADR-0002)
  - consumed/expired verification tokens, closed invitations older than 30 days, read notifications older than 90 days
- The job is **idempotent by construction** — it only deletes things that are definitionally dead, so overlapping or repeated runs are harmless.

## Consequences

- A 30-day undo window exists in the data model today; the trash/restore UI can come later without schema changes.
- In-process cron is a single point tied to the API process — acceptable for one Railway instance; would move to a scheduled job runner if the API ever scales horizontally.
