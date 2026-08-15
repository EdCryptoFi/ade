# ADR-005 — Tenant token/ID never trusted from the frontend

- **Status:** Accepted
- **Date:** 2026-08-12
- **Domain:** fintech / fiscal (transportation)
- **Reference:** evolves from the ADE audit finding (`LAW-5` / `user ID from token`)

## Context

In the simulation, the ADE audit issued 18 critical findings including "validate identity from the token, not from request fields". In a fiscal multi-tenant product, the risk is paid tenant-to-tenant (listing another company's NFe by swapping `tenant_id` in the body).

## Decision

The server is the single source of truth for tenant identity:

- `tenant_id` and `user_id` are always derived from the **verified JWT** (iss, aud, sub, tenant claim). Errors on this path violate `LAW-1` and `LAW-5`.
- No route accepts `tenant_id` in path/body/query to authorize access; the token value is compared against the one in the URL only for consistency, never to authorize.
- The frontend only sends resource references (`nfe_id`, `freight_id`); scopes are resolved via RLS (ADR-004).

## Consequences

- **Pros:** eliminates the class of IDOR/tenant-spoofing bugs; RLS acts as a second barrier.
- **Cons:** requires scope clauses on every query (replaceable by RLS).
- **Reported regression:** the `domain-analysis` fix (word-boundary `ai`/`ia`) does not change this behavior; auditing is evergreen.

## Impact on ADE

- `audit.json` (top actions): `LAW-1` server-side validation, `LAW-5` user ID from token, `LAW-6` auth ≠ authorization.