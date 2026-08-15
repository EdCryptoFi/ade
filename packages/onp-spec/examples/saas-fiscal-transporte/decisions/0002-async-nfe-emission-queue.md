# ADR-002 — Async NFe emission with queue

- **Status:** Accepted
- **Date:** 2026-08-12
- **Domain:** fintech / fiscal (transportation)

## Context

NFe issuance involves an external integration (SEFAZ/authorizing SEFAZ). It cannot be synchronous within the HTTP request: variable response time, retries, status polling (authorized, denied, processing). The system also issues CT-e (transport knowledge) with the same characteristic.

## Decision

Issuance and status lookup are **async jobs**:

- The HTTP request only enqueues (`enqueue nfe.emission`) and returns `status: pending`.
- The worker processes: builds the XML, signs it (A1 certificate), transmits via the SEFAZ webservice, records the protocol/status.
- Status polling and retries with exponential backoff + dead-letter queue.
- The ADE `InfrastructureDecision` now recommends BullMQ/Inngest for fiscal domains even without explicit `backgroundJobs`.

## Consequences

- **Pros:** UI does not block; resilient to SEFAZ failures; traceable via job status.
- **Cons:** eventually consistent state; requires an NFe status UI (`NfeStatusTracker`).
- **Components:** `NfeEmissionForm`, `NfeStatus`, `NfeStatusTracker` (`fintech`/`transportation` templates).

## Impact on ADE

- `infrastructure-decision.ts` / `settings.ts`: `isFiscal` → default background jobs "NFe emission, SEFAZ status polling, reconciliation jobs".
