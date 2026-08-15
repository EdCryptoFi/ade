# SaaS Fiscal for Transportation — ADE Simulation Example

End-to-end example of the `@ade/core` engine applied to a SaaS for **freight payment control and electronic invoice (NFe) issuance** for transportation companies.

## Simulated input

```json
{
  "description": "SaaS for transportation companies: freight payment control and electronic invoice (NFe) issuance, driver and fleet management, payment reconciliation, financial reporting and fiscal compliance",
  "domain": "transportation",
  "users": 5000,
  "auth": true,
  "payments": true,
  "multiTenant": true,
  "realtime": true,
  "apiAccess": true,
  "auditLog": true,
  "notifications": true,
  "webhooks": true,
  "sso": true,
  "features": ["nfe", "fleets", "freights", "reconciliation", "compliance"]
}
```

## Output

| Artifact | Result |
|---|---|
| Classified domain | `fintech` (before the fix: `ai-agent` — false positive) |
| Components | Accounts, Payments, Invoicing (NFe), Compliance, TeamManagement, TenantAdmin, AuditLog, SSOConfig |
| AI | `false` |
| Database | Supabase PostgreSQL + ledger tables (payments/invoices) + RLS |
| Background jobs | NFe emission, SEFAZ status polling, reconciliation |

## Architecture Decisions (ADRs)

- [ADR-001 — Immutable ledger with hash-chaining](decisions/0001-immutable-ledger.md)
- [ADR-002 — Async NFe emission with queue](decisions/0002-async-nfe-emission-queue.md)
- [ADR-003 — Reconciliation as a scheduled job + matching by key triple](decisions/0003-reconciliation-job.md)
- [ADR-004 — Multi-tenancy with per-tenant RLS](decisions/0004-multitenancy-rls.md)
- [ADR-005 — Tenant token/ID never trusted from the frontend](decisions/0005-tenant-id-frontend.md)

## How to reproduce

```bash
node --experimental-strip-types packages/ade-core/.sandbox/run.mjs
```
