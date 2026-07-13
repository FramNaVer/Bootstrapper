# ADR-0002: SHA-256 token hashing at the repository boundary + rotation with reuse detection

**Status:** Accepted · 2026-07 (security review)

## Context

Refresh tokens, email verification tokens, password-reset tokens, and invitation tokens were originally stored **in plaintext**. A database leak (or a malicious read) would hand out live credentials. Passwords use bcrypt — but bcrypt is wrong for lookup tokens: its per-hash random salt makes `findUnique(token)` impossible, and its slowness exists to resist brute force of *low-entropy* secrets, which 256-bit random tokens are not.

## Decision

- Hash all lookup tokens with **SHA-256** before storage. Deterministic hashing keeps `findUnique` working; high entropy makes offline brute force meaningless, so a slow hash buys nothing.
- Apply hashing **inside the repository implementation** (`save`/`findByToken`/`revoke`), not in use cases — five use cases share the token repository, and a repository-level guarantee makes "forgot to hash" impossible by construction.
- Keep **refresh rotation**: every `/refresh` revokes the old token and issues a new pair. If a **revoked-but-unexpired** token is presented again, treat it as theft and revoke *all* the user's sessions.

## Consequences

- DB contents are useless to an attacker; the raw token exists only in transit and in the client.
- Revoked-but-unexpired tokens must be **kept** until expiry — they are the reuse-detection tripwire. The purge job deletes only *expired* tokens.
- Migration note: hashes were written into the existing `token` column (no rename) to stay expand-contract safe (see ADR-0003).
