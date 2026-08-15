# ADR-003 — Reconciliation as a scheduled job + matching by key triple

- **Status:** Accepted
- **Date:** 2026-08-12
- **Domain:** fintech / fiscal (transportation)

## Context

The product description includes "payment reconciliation": matching the freight paid by the contracting party, the driver's commission and the platform fee against bank statements/PIX/boleto. Reconciliation is batch processing, not an interactive transaction.

## Decision

Reconciliation runs as a **scheduled job** (daily) matching three keys:

- `NFe/CT-e` (fiscal identifier)
- `payment reference` (PIX id / boleto line / gateway webhook id)
- `freight id` (internal freight order)

Results: generate ledger entries (ADR-001) and trigger `AlertsCenter` for discrepancies. A discrepancy = entry marked `unmatched` + notification.

## Consequences

- **Pros:** discrepancies detected automatically; audit trail; traceable across 3 paths.
- **Cons:** requires key standardization at issuance; imperfect matching needs manual review.
- **Components:** `ReconciliationView` / `PaymentsDashboard` + `AlertsCenter` + `CompliancePanel`.

## Impact on ADE

- `fintech` category includes the `conciliação` keyword; background pipeline "reconciliation jobs" in the infrastructure recommendation.
