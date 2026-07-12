# ADR-0001: Module-based Clean Architecture

**Status:** Accepted · 2026-05

## Context

The project started as a hardened auth core and was always meant to grow into a multi-tenant SaaS with several bounded contexts (auth, organizations, boards, chat, notifications). A single flat `domain/application/infrastructure/presentation` tree gets crowded fast: unrelated features share folders, and it becomes unclear which entity belongs to which feature.

## Decision

Organize by **module first, layer second**:

```
src/modules/<module>/{domain,application,infrastructure,presentation}
src/shared/            # cross-cutting: env, prisma client, errors, middlewares, realtime, jobs
```

Rules:

- Dependencies point inward within a module (presentation → application → domain; infrastructure implements domain interfaces).
- Use cases depend on **repository interfaces** (domain); Prisma implementations are injected at each module's **composition root** — its route file.
- Modules may use another module's *published* pieces (e.g. board routes use organization's `requireRole` middleware and `MembershipRepository`), never its internals.

## Consequences

- New features land as new modules (chat was added end-to-end without touching other modules except one line in `app.ts` and the shared socket file).
- Unit tests mock repository interfaces — no DB needed; business rules are cheap to lock in.
- Cost: more files per feature (interface + implementation + wiring). Accepted for the learning value and testability.
- The composition root lives in route files rather than a DI container — fine at this scale, revisit if wiring grows painful.
