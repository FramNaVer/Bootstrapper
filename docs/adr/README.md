# Architecture Decision Records

Short documents capturing **why** the significant decisions were made — the context and trade-offs, not just the outcome. Format: Context → Decision → Consequences.

| # | Decision | Status |
|---|----------|--------|
| [0001](0001-clean-architecture-module-structure.md) | Module-based Clean Architecture | Accepted |
| [0002](0002-token-storage-and-rotation.md) | SHA-256 token hashing at the repository boundary + refresh rotation with reuse detection | Accepted |
| [0003](0003-shared-database-expand-contract.md) | Shared dev/prod database → expand–contract migrations only | Accepted |
| [0004](0004-multi-tenancy-rbac.md) | Shared-schema multi-tenancy with `organizationId` + membership RBAC middleware | Accepted |
| [0005](0005-realtime-strategy.md) | Two real-time patterns: invalidate-over-the-wire vs. data push | Accepted |
| [0006](0006-soft-delete-and-purge.md) | Soft delete with nightly purge cron | Accepted |
