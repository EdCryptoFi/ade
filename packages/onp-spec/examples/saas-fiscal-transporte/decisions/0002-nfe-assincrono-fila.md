# ADR-002 — Emissão de NFe assíncrona com fila

- **Status:** Aceito
- **Data:** 2026-08-12
- **Domínio:** fintech / fiscal (transporte)

## Contexto

Emissão de NFe envolve integração externa (SEFAZ/SEFAZ autorizadora). Não pode ser síncrona na request HTTP: tempo de resposta variável, retries, status polling (autorizada, denegada, em processamento). O sistema também emite CT-e (conhecimento de transporte) com a mesma característica.

## Decisão

Emissão e consulta de status são **jobs assíncronos**:

- A request HTTP apenas enfileira (`enqueue nfe.emission`) e retorna `status: pending`.
- O worker processa: monta XML, assina (certificado A1), transmite via webservice da SEFAZ, grava protocolo/status.
- Polling de status e retries com backoff exponencial + dead-letter queue.
- O `InfrastructureDecision` do ADE agora recomenda BullMQ/Inngest para domínios fiscais mesmo sem `backgroundJobs` explícito.

## Consequências

- **Prós:** UI não bloqueia; resiliente a falha da SEFAZ; rastreável via status do job.
- **Contras:** estado eventualmente consistente; precisa de UI de status de NFe (`NfeStatusTracker`).
- **Componentes:** `NfeEmissionForm`, `NfeStatus`, `NfeStatusTracker` (templates `fintech`/`transportation`).

## Reflexo no ADE

- `infrastructure-decision.ts` / `settings.ts`: `isFiscal` → default de background jobs "NFe emission, SEFAZ status polling, reconciliation jobs".
