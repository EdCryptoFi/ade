# ADR-004 — Multi-tenancy com RLS por tenant

- **Status:** Aceito
- **Data:** 2026-08-12
- **Domínio:** fintech / fiscal (transporte)

## Contexto

Produto SaaS com `multiTenant: true`: cada empresa de transporte vê apenas seus dados (frotas, fretes, NFe, pagamentos). Dados fiscais são sensíveis e regulados.

## Decisão

Isolamento por tenant via **RLS (Row Level Security)** no Supabase/PostgreSQL:

- Toda tabela de negócio tem `tenant_id` + policy `tenant_id = auth.jwt() ->> 'tenant_id'`.
- Token JWT contém `tenant_id` emitido pelo servidor — **nunca** lido do payload do cliente (ver ADR-005).
- Admin da plataforma usa role separada com permissão cross-tenant auditada.
- Chaves criptográficas de certificado NFe por tenant, armazenadas isoladas.

## Consequências

- **Prós:** isolamento garantido no banco (não só na API); policy é um ponto único.
- **Contras:** precisa de políticas bem definidas por tabela; JWT precisa carregar tenant de forma segura.
- **Componentes:** `TenantAdmin`, `TeamManagement`, `AuditLog`.

## Reflexo no ADE

- `settings.ts` / `recommendSecurity`: recomendação de RLS disparada quando `multiTenant`.
- `settings.ts` (`recommendInfrastructure`): `isSaaS` → backend `tRPC`; DB fiscal → `+ RLS`.
