# ADR-003 — Conciliação como job agendado + reconciliação por tripla de chaves

- **Status:** Aceito
- **Data:** 2026-08-12
- **Domínio:** fintech / fiscal (transporte)

## Contexto

A descrição do produto inclui "conciliação de recebimentos": cruzar frete pago pelo contratante, comissão do motorista e taxa da plataforma com extratos bancários/PIX/boleto. Conciliação é processamento em lote, não transação interativa.

## Decisão

Conciliação roda como **job agendado** (diário) cruzando três chaves:

- `NFe/CT-e` (identificador fiscal)
- `payment reference` (PIX id / boleto line / webhook gateway id)
- `freight id` (pedido de frete interno)

Resultados: geram lançamentos no ledger (ADR-001) e disparam `AlertsCenter` para divergências. Divergência = lançamento marcado `unmatched` + notificação.

## Consequências

- **Prós:** divergências detectadas automaticamente; trilha de auditoria; rastreável por 3 vias.
- **Contras:** exige padronização de chaves na emissão; matching imperfeito precisa de revisão manual.
- **Componentes:** `ReconciliationView` / `PaymentsDashboard` + `AlertsCenter` + `CompliancePanel`.

## Reflexo no ADE

- Categoria `fintech` inclui keyword `conciliação`; boj pipeline "reconciliation jobs" na recomendação de infraestrutura.