# ADR-005 — Token/ID de tenant nunca confiado pelo frontend

- **Status:** Aceito
- **Data:** 2026-08-12
- **Domínio:** fintech / fiscal (transporte)
- **Referência:** evolve-se do achado de auditoria do ADE (`LAW-5` / `user ID from token`)

## Contexto

Na simulação, a auditoria do ADE emitiu 18 achados críticos incluindo "validar identidade a partir do token, não de campos do request". Em produto multi-tenant fiscal, o risco é paid-tenant-to-tenant (listar NFe de outra empresa trocando `tenant_id` no body).

## Decisão

O servidor é a única fonte de verdade para identidade do tenant:

- `tenant_id` e `user_id` sempre derivados do **JWT verificado** (iss, aud, sub, tenant claim). Erros nesse caminho violam `LAW-1` e `LAW-5`.
- Nenhuma rota aceita `tenant_id` no path/body/query para autorizar acesso; o valor do token é comparado com o da URL apenas para consistência, nunca para autorizar.
- Frontend envia apenas referências de recursos (`nfe_id`, `freight_id`); escopos são resolvidos via RLS (ADR-004).

## Consequências

- **Prós:** elimina classe de bugs de IDOR/tenant spoofing; RLS atua como segunda barreira.
- **Contras:** exige cláusulas de escopo em toda query (trocável por RLS).
- **Regressão reportada:** fix do `domain-analysis` (word-boundary `ai`/`ia`) não altera este comportamento; auditoria perene.

## Reflexo no ADE

- `audit.json` (top actions): `LAW-1` server-side validation, `LAW-5` user ID from token, `LAW-6` auth ≠ authorization.