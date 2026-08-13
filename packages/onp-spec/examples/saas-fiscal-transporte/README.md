# SaaS Fiscal para Transportes — Exemplo de Simulação ADE

Exemplo end-to-end do motor `@ade/core` aplicado a um SaaS de **controle de pagamentos de fretes e emissão de notas fiscais eletrônicas (NFe)** para empresas de transporte.

## Input simulado

```json
{
  "description": "SaaS para empresas de transporte: controle de pagamentos de fretes e emissão de notas fiscais eletrônicas (NFe), gestão de motoristas e frotas, conciliação de recebimentos, relatórios financeiros e compliance fiscal",
  "domain": "transportes",
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
  "features": ["nfe", "frotas", "fretes", "conciliação", "compliance"]
}
```

## Saída

| Artefato | Resultado |
|---|---|
| Domínio classificado | `fintech` (antes do fix: `ai-agent` — falso positivo) |
| Componentes | Accounts, Payments, Invoicing (NFe), Compliance, TeamManagement, TenantAdmin, AuditLog, SSOConfig |
| AI | `false` |
| Database | Supabase PostgreSQL + ledger tables (payments/invoices) + RLS |
| Background jobs | NFe emission, SEFAZ status polling, reconciliation |

## Pontos de Arquitetura (ADRs)

- [ADR-001 — Ledger imutável com hash-chaining](decisions/0001-ledger-imutavel.md)
- [ADR-002 — Emissão de NFe assíncrona com fila](decisions/0002-nfe-assincrono-fila.md)
- [ADR-003 — Conciliação como job agendado + reconciliação por tripla de chaves](decisions/0003-conciliacao-job.md)
- [ADR-004 — Multi-tenancy com RLS por tenant](decisions/0004-multitenancy-rls.md)
- [ADR-005 — Token/ID de tenant nunca confiado pelo frontend](decisions/0005-tenant-id-frontend.md)

## Como reproduzir

```bash
node --experimental-strip-types packages/ade-core/.sandbox/run.mjs
```
