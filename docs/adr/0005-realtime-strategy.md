# ADR-0005: Two real-time patterns — invalidate-over-the-wire vs. data push

**Status:** Accepted · 2026-06 (boards) / extended 2026-07 (chat)

## Context

Live collaboration needs three things: board changes visible to everyone viewing the board, instant notifications, and chat. A single pattern ("always push the data" or "always tell clients to refetch") fits none of them perfectly.

## Decision

Pick the pattern per feature:

| Feature | Pattern | Event |
|---------|---------|-------|
| Board changes | **signal → refetch** | `board:change` (empty payload) |
| Presence | server-computed push | `board:presence` |
| Notifications | signal → refetch | `notification:new` |
| Chat | **data push** | `chat:new` (full message) |

Rationale:

- **Boards**: state is complex (lists × cards × positions × labels × assignees). Pushing deltas means reimplementing merge logic client-side; instead the server emits an empty signal after any successful board mutation (an Express `res.on("finish")` middleware) and clients refetch through TanStack Query — the cache layer they already trust.
- **Chat**: latency matters and a message is self-contained. Refetching a paginated history on every message is wasteful; clients append the pushed message into the query cache, deduplicating by id (senders receive it twice: POST response + room echo).
- **Presence**: names/emails are resolved server-side from the JWT — clients cannot spoof identity.

All rooms are authorization-checked on join; the socket handshake itself is JWT-authenticated.

## Consequences

- Board realtime is nearly free to maintain — new mutations broadcast automatically via the route middleware.
- Signal-based refetch costs extra reads; acceptable at classroom scale, and rate-limit tiers account for it.
- Chat's cache surgery (append + dedupe) is more delicate client code, isolated in one hook.
