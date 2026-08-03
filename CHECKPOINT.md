# ADE — Checkpoint

**Data:** 02 Aug 2026
**Versão:** v0.1
**Branch:** main (28 commits)
**Último commit:** `589c89d` feat(onp-spec): translate engine, templates, skills, tests and docs to English

---

## Estado Atual

Tudo feito. Suíte verde.

- **onp-spec** (`packages/onp-spec`, `@ade/onp-spec`, zero deps): motor spec-anchored 100% em inglês — `src/` (parsers, core, cli), `templates/`, `skills/` (4 SKILL.md + references + mirrors embarcados), `test/`, `examples/inscricao-turma`, `benchmark/`, docs. **236/236 testes passando.** Typecheck limpo.
- **MCP** (`apps/mcp`): 20 tools (17 ADE + 3 spec: `ade-spec-audit`, `ade-spec-status`, `ade-spec-scaffold`). Validadas via driver stdio com `rootDir` — audit limpo (ok, exit 0).
- Suíte do workspace: `pnpm -r typecheck` ok (tsc mcp/api + 242 testes onp-spec).
- Benchmark: onp-spec-driven 100% detecção, baseline limpo.

## Decisões / Restrições Mantidas na Tradução

- Códigos de achado (AC_SEM_TESTE, AC_SEM_PROVA, TESTE_ORFAO, ...) NÃO mudam.
- Comandos/flags da CLI (`--modelo`, `--esforco`, `--faixa`, ...) e nomes de arquivos gerados (executar-tarefas.sh, plano-execucao.*, sinais.json, licoes.json) NÃO mudam.
- Identificadores internos do ledger (`concluidas`, `pendentes`, timeline `inicio/ferramenta/saida`) permanecem PT por design.
- Glossário canônico PT→EN: Given/When/Then, Assumptions/Open Questions, draft|ready|in-implementation|implemented|audited, open|confirmed|invalidated, pending|in-progress|done, MUST|SHOULD|MAY, verification(test|forbidden|required|gate), Files:|Model:|Effort:, severity error|warning, VERIFY_FAILED|VERIFY_SKIPPED.

## Próximos Passos Possíveis

1. **Publicar no npm** — `@ade/onp-spec` e `@ade/ade-core`
2. **Mais tradeoff categories** — mobile, analytics, messaging, cache
3. **LLM-powered recommendations** — integrar OpenAI/Claude para recomendações contextuais
4. **Web UI** — frontend visual para o wizard em vez de só MCP
5. **Testes de scaffolding** — validar que os arquivos gerados compilam
6. **Plugin system** — permitir comunidades adicionarem decisões customizadas

## Como Retomar

```bash
cd /Volumes/VibeCode/Architeture Decision Engine/ade
pnpm install
pnpm turbo typecheck
pnpm --filter @ade/onp-spec test        # 236 testes
node packages/onp-spec/bin/onp-spec.js help
pnpm --filter @ade/mcp start            # MCP server (stdio)
pnpm --filter @ade/api dev              # Cloudflare Worker
```

## Estrutura

```
ade/
├── apps/
│   ├── mcp/       → 20 tools (17 ADE + 3 onp-spec), wizard 4 passos, sessions.json
│   ├── api/       → Cloudflare Worker (POST /analyze)
│   └── site/      → Next.js playground
├── packages/
│   ├── ade-core/  → Engine (Zod, Vitest)
│   └── onp-spec/  → @ade/onp-spec, motor spec-anchored em EN (zero deps, bin onp-spec)
├── .github/
│   ├── workflows/ci.yml
│   └── dependabot.yml
├── CHECKPOINT.md
└── README.md
```
