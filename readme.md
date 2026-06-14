# Bootstrapper — Multi-Tenant SaaS API

A production-minded backend built to enterprise standards: **Clean Architecture**, strong typing, secure authentication, and a clear path toward a full multi-tenant SaaS platform.

> This project starts from a hardened authentication core and grows — phase by phase — into a team-based project/task management SaaS (think a minimal Linear/Trello backend). It is built as a learning + portfolio project, with real deployment in mind.

---

## Tech Stack

| Concern | Choice |
|--------|--------|
| Language | TypeScript (strict) |
| Runtime / Framework | Node.js + Express 5 |
| Database | PostgreSQL (Neon) via Prisma 7 |
| Auth | JWT (access + rotating refresh) + Passport OAuth (Google, GitHub) |
| Validation | Zod (request + environment) |
| Security | Helmet, CORS, rate limiting, bcrypt |
| Logging | Pino (structured) + correlation IDs |
| Testing | Vitest |

---

## Architecture

The codebase follows **Clean Architecture** with strict dependency direction — inner layers never depend on outer layers.

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation   routes · controllers · middlewares · validators│  HTTP ↔ use case
├─────────────────────────────────────────────────────────────┤
│  Application    use cases · ports (interfaces) · utils        │  business workflows
├─────────────────────────────────────────────────────────────┤
│  Domain         entities · repository interfaces · errors     │  core rules (no deps)
├─────────────────────────────────────────────────────────────┤
│  Infrastructure prisma · repositories · config · logging      │  concrete adapters
└─────────────────────────────────────────────────────────────┘
```

**Key principles**

- **Dependency Inversion** — use cases depend on repository *interfaces* (`domain/repositories`); Prisma implementations live in `infrastructure` and are wired only at the composition root.
- **Composition Root** — all concrete classes are instantiated and injected in one place (`presentation/routes/v1/auth.route.ts`). The rest of the code knows only interfaces.
- **Fail fast on config** — environment variables are validated once at boot with Zod (`infrastructure/config/env.ts`). Missing config crashes the app immediately with a clear message.
- **API versioning** — routes are namespaced under `/api/v1`, leaving room for `/v2` without breaking clients.

### Project structure

```
src/
├── domain/                 # entities, repository interfaces, domain errors
├── application/            # use cases (business logic), utils (jwt), ports
├── infrastructure/         # prisma client, repositories, config, logging
└── presentation/           # routes, controllers, middlewares, validators
main.ts                     # app entry point + middleware pipeline
prisma/schema.prisma        # data model
```

---

## Security Highlights

- **Refresh token rotation + reuse detection** — every refresh issues a new token pair and revokes the old one. A revoked token being reused triggers a full revoke of the user's sessions (theft signal).
- **Account-takeover protection on OAuth** — provider emails are only trusted when verified; inactive users cannot authenticate via any path.
- **No secrets in the repo** — real credentials live outside git; see `.env.example` for required variables.
- **Defense in depth** — Helmet headers, CORS allow-list, per-route rate limiting, and `trust proxy` enabled only in production.

---

## Roadmap — from Auth Core to Multi-Tenant SaaS

The product is a **team project/task manager**: organizations invite members, create projects, and collaborate on tasks — with each organization's data fully isolated (tenant isolation) and role-based permissions (RBAC).

| Phase | Scope | Enterprise skills demonstrated |
|------|-------|-------------------------------|
| **0** ✅ | Hardened auth core (JWT rotation, OAuth, rate limit, env validation) | Clean Architecture, secure auth |
| **1** 🚧 | Email verification + password reset | Background jobs, email service, token flows |
| **2** | Organizations · Memberships · Invitations | Multi-tenancy, **RBAC / authorization** |
| **3** | Projects · Tasks (core domain) | Pagination, filtering, soft delete, DB transactions |
| **4** | Real-time task updates | WebSocket / SSE, event-driven design |
| **5** | Observability · API docs · CI/CD · Deploy | Sentry, health checks, OpenAPI, Docker, integration tests |
| **6** *(optional)* | Per-organization billing | Stripe, webhooks, idempotency, plan limits |

### Multi-tenancy strategy

Shared database, shared schema, with an `organizationId` discriminator on every tenant-scoped table. A single authorization middleware resolves the caller's membership and role for the requested organization, and every tenant-scoped query is filtered by `organizationId` — preventing cross-tenant data access.

### Planned domain model

```
User ── Membership ──► Organization (tenant)
                          ├─ Invitation
                          └─ Project
                               └─ Task ── Comment / ActivityLog
```

Roles per organization: `OWNER` · `ADMIN` · `MEMBER` · `VIEWER`.

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # then fill in the values

# 3. Apply database schema
npx prisma migrate dev

# 4. Run in development
npm run dev
```

### Useful scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the dev server (ts-node) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm test` | Run the test suite (Vitest) |
| `npm run test:coverage` | Run tests with coverage |

### Core API endpoints (v1)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Create an account |
| `POST` | `/api/v1/auth/login` | Email + password login |
| `POST` | `/api/v1/auth/refresh` | Rotate tokens |
| `POST` | `/api/v1/auth/logout` | Revoke a refresh token |
| `GET`  | `/api/v1/auth/google` | Google OAuth |
| `GET`  | `/api/v1/auth/github` | GitHub OAuth |

---

## License

ISC
