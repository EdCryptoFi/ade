# ADR-001 — Ledger imutável com hash-chaining

- **Status:** Aceito
- **Data:** 2026-08-12
- **Domínio:** fintech / fiscal (transporte)

## Contexto

O domínio exige trilha financeira auditável: pagamentos de fretes, conciliação de recebimentos e compliance fiscal (NFe/SEFAZ). Auditorias podem questionar a integridade de lançamentos. Alterações tardias de valores são um risco real em sistemas de pagamento.

## Decisão

Todos os lançamentos financeiros são gravados em tabelas de ledger **append-only** com encadeamento criptográfico:

- Cada linha possui `prev_hash`, `hash` (SHA-256 do payload + prev_hash), `created_at` e `actor_id`.
- Updates proibidos; correções são lançamentos de estorno/reversão apontando para o lançamento original.
- Hash-chaining permite detectar alteração silenciosa em qualquer linha anterior (verificação O(n)).

## Consequências

- **Prós:** detecção de adulteração; trilha de auditoria imutável; base para compliance (Lei do SIMPLES, retenções, CT-e/NFe).
- **Contras:** sem UPDATE direto (mais código de estorno); custo de hash por linha desprezível.
- **Trade-off aceito:** integridade > simplicidade de escrita.

## Alternativas consideradas

- Tabela mutável com `updated_at` — rejeitada: não detecta adulteração retroativa.
- Blockchain (Sui/Walrus) para o ledger — rejeitada para o nível 1: latência e custo não justificam; hash-chaining em banco relacional atende ao requisito de integridade. ADE recomenda `blockchain: false` para este caso.

## Reflexo no ADE

- `settings.ts` (recommendSecurity): `"Immutable financial ledger (append-only) with hash-chaining for audit integrity"` — adicionado quando `auditLog || payments`.
