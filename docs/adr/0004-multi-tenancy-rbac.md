# ADR-0004: Shared-schema multi-tenancy with `organizationId` + membership RBAC middleware

**Status:** Accepted · 2026-06

## Context

Organizations are tenants: one user belongs to many orgs with different roles, and one org's data must be invisible to outsiders. Options considered: database-per-tenant (operationally heavy, absurd at this scale), schema-per-tenant (same, lighter), shared schema with a discriminator column (standard for SaaS at small/medium scale).

## Decision

- **Shared schema** with an `organizationId` column on *every* tenant-scoped table — including denormalized copies on deep children (`Card.organizationId`, `Card.boardId`) so authorization and queries never need multi-level JOINs.
- A single **RBAC middleware factory** `requireRole(membershipRepo, ...roles)` resolves the caller's membership for `:orgId` on every request; no roles listed = "any member". Controllers/use cases receive the resolved role for business rules.
- Business-rule guards live in use cases, not middleware: creator protection (the org creator cannot be demoted/removed) and the last-owner guard (an org can never end up ownerless).
- Socket rooms re-check membership server-side on join (`board:` and `org:` rooms) — the same tenant boundary applies to real-time.

## Consequences

- Tenant isolation is enforced in two places (middleware + query filters), and integration tests lock the 403 paths.
- Denormalized `organizationId` must be written correctly at create time — a small invariant, covered by tests.
- Row-Level Security in Postgres remains available later; the schema is already shaped for it.
