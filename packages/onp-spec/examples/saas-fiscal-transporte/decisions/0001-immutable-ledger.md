# ADR-001 — Immutable ledger with hash-chaining

- **Status:** Accepted
- **Date:** 2026-08-12
- **Domain:** fintech / fiscal (transportation)

## Context

The domain requires an auditable financial trail: freight payments, payment reconciliation and fiscal compliance (NFe/SEFAZ). Audits may question the integrity of ledger entries. Late value changes are a real risk in payment systems.

## Decision

All financial entries are written to **append-only** ledger tables with cryptographic chaining:

- Each row has `prev_hash`, `hash` (SHA-256 of the payload + prev_hash), `created_at` and `actor_id`.
- Updates are forbidden; corrections are reversal/reversal entries pointing to the original entry.
- Hash-chaining makes silent tampering of any prior row detectable (O(n) verification).

## Consequences

- **Pros:** tamper detection; immutable audit trail; foundation for compliance (SIMPLES regime, withholdings, CT-e/NFe).
- **Cons:** no direct UPDATE (more reversal code); negligible per-row hashing cost.
- **Accepted trade-off:** integrity > write simplicity.

## Alternatives considered

- Mutable table with `updated_at` — rejected: does not detect retroactive tampering.
- Blockchain (Sui/Walrus) for the ledger — rejected for layer 1: latency and cost are not justified; hash-chaining in a relational database meets the integrity requirement. ADE recommends `blockchain: false` for this case.

## Impact on ADE

- `settings.ts` (recommendSecurity): `"Immutable financial ledger (append-only) with hash-chaining for audit integrity"` — added when `auditLog || payments`.
