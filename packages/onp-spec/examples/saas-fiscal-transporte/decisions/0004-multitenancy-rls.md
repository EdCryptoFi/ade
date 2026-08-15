# ADR-004 — Multi-tenancy with per-tenant RLS

- **Status:** Accepted
- **Date:** 2026-08-12
- **Domain:** fintech / fiscal (transportation)

## Context

SaaS product with `multiTenant: true`: each transportation company sees only its own data (fleets, freights, NFe, payments). Fiscal data is sensitive and regulated.

## Decision

Per-tenant isolation via **RLS (Row Level Security)** in Supabase/PostgreSQL:

- Every business table has `tenant_id` + policy `tenant_id = auth.jwt() ->> 'tenant_id'`.
- The JWT token carries `tenant_id` issued by the server — **never** read from the client payload (see ADR-005).
- Platform admins use a separate role with audited cross-tenant permission.
- NFe certificate cryptographic keys are per tenant, stored isolated.

## Consequences

- **Pros:** isolation guaranteed at the database level (not only the API); the policy is a single point of control.
- **Cons:** requires well-defined policies per table; JWT must carry the tenant securely.
- **Components:** `TenantAdmin`, `TeamManagement`, `AuditLog`.

## Impact on ADE

- `settings.ts` / `recommendSecurity`: RLS recommendation triggered when `multiTenant`.
- `settings.ts` (`recommendInfrastructure`): `isSaaS` → backend `tRPC`; fiscal DB → `+ RLS`.