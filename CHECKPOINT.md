# ADE — Checkpoint

**Data:** 03 Aug 2026
**Versão:** v0.1
**Branch:** main (28 commits → +1)
**Último commit:** `4eff190` docs: sync README structure with 19 MCP tools and onp-spec engine

---

## Estado Atual

Suíte verde em todo o monorepo após a auditoria Zero-Trust completa.

- **onp-spec** (`packages/onp-spec`, `@ade/onp-spec`, zero deps): motor spec-anchored 100% em inglês. **236/236 testes passando.** Typecheck limpo.
- **MCP** (`apps/mcp`): **19 tools** (16 ADE + 3 spec: `ade-spec-audit`, `ade-spec-status`, `ade-spec-scaffold`). Endurecido (ver abaixo).
- **Core** (`packages/ade-core`): **56/56 testes** (5 files), schemas `strict` + limites.
- **API** (`apps/api`): **6/6 testes** de segurança (rate limit, CORS, headers).
- **Site** (`apps/site`): **10/10 testes** (features, format, api client), build Next.js ok, container/presentation.
- Suíte do workspace: `pnpm -r typecheck` ok (tsc api/mcp/site + 242 testes onp-spec).

## Fase de Segurança — Hardening Aplicado (Auditoria Zero-Trust)

- **API** (`apps/api/src/security.ts` novo): rate limiter sliding-window 30 req/60s por IP + por API key (fallback in-memory; suporta binding `RATE_LIMITER` do Workers), 429 com `Retry-After`; CORS allowlist (`ALLOWED_ORIGINS`, default `https://ade-vibe.vercel.app,http://localhost:3000`); security headers (`nosniff`, `X-Frame-Options: DENY`, HSTS, Referrer-Policy, Permissions-Policy, no-store); erros 500 genéricos com log completo no servidor; endpoint `/schema`.
- **Core** (`validation.ts`): `ProjectInputSchema` e `PartialProjectInputSchema` agora `.strict()` (mass assignment rejeitado — LAW-2), `features` `max(50)` + itens `min(1).max(200)`, `users` `max(1_000_000_000)` (LAW-3).
- **MCP** (`apps/mcp/src/index.ts`): session ids via `randomUUID()` (`proj_<uuid>`, validadas por regex); clamps de entrada (`MAX_DESCRIPTION=2000`, `MAX_DOMAIN=100`, `MAX_FEATURE_LEN=200`, `MAX_FEATURES=50`); `sanitizeFeatureFlags` com whitelist (feature desconhecida → erro seguro); `catch {}` silencioso removido (logs estruturados `{scope, tool, error}`); erros de tool retornam `{isError: true}` com mensagem segura. `sessions.json` adicionado ao `.gitignore` (LAW-11).
- **Site** (`apps/site`): refatorado para container/presentation (`components/ProjectForm.tsx`, `ResultViewer.tsx`, `PlaygroundContainer.tsx`; lógica pura em `lib/features.ts`, `lib/format.ts`, `lib/api.ts`); URL da API via `NEXT_PUBLIC_ADE_API_URL` (sem host hardcoded); security headers no `next.config.ts`.
- Nenhum secret hardcoded no repo; `.env` gitignored; workflows usam GitHub secrets.

## Decisões / Restrições Mantidas na Tradução

- Códigos de achado (AC_SEM_TESTE, AC_SEM_PROVA, TESTE_ORFAO, ...) NÃO mudam.
- Comandos/flags da CLI (`--modelo`, `--esforco`, `--faixa`, ...) e nomes de arquivos gerados (executar-tarefas.sh, plano-execucao.*, sinais.json, licoes.json) NÃO mudam.
- Identificadores internos do ledger (`concluidas`, `pendentes`, timeline `inicio/ferramenta/saida`) permanecem PT por design.
- Glossário canônico PT→EN: Given/When/Then, Assumptions/Open Questions, draft|ready|in-implementation|implemented|audited, open|confirmed|invalidated, pending|in-progress|done, MUST|SHOULD|MAY, verification(test|forbidden|required|gate), Files:|Model:|Effort:, severity error|warning, VERIFY_FAILED|VERIFY_SKIPPED.

## Próximos Passos Possíveis

1. **Incluir testes de segurança no CI** — hoje o CI roda só `pnpm turbo typecheck` + `pnpm --filter @ade/core test`; adicionar api/site tests e onp-spec.
2. **Publicar no npm** — `@ade/onp-spec` e `@ade/ade-core`
3. **Mais tradeoff categories** — mobile, analytics, messaging, cache
4. **LLM-powered recommendations** — integrar OpenAI/Claude para recomendações contextuais
5. **Testes de scaffolding** — validar que os arquivos gerados compilam
6. **Plugin system** — permitir comunidades adicionarem decisões customizadas

## Como Retomar

```bash
cd /Volumes/VibeCode/Architeture Decision Engine/ade
pnpm install
pnpm turbo typecheck
pnpm --filter @ade/onp-spec test        # 236 testes
pnpm --filter @ade/core test            # 56 testes
pnpm --filter @ade/api test             # 6 testes (segurança)
pnpm --filter @ade/site test            # 10 testes
node packages/onp-spec/bin/onp-spec.js help
pnpm --filter @ade/mcp start            # MCP server (stdio)
pnpm --filter @ade/api dev              # Cloudflare Worker
```

## Estrutura

```
ade/
├── apps/
│   ├── mcp/       → 19 tools (16 ADE + 3 onp-spec), wizard 4 passos, sessions.json (gitignored)
│   ├── api/       → Cloudflare Worker (POST /analyze, /audit, GET /health, /schema) + security.ts
│   └── site/      → Next.js playground (container/presentation, lib/ pura)
├── packages/
│   ├── ade-core/  → Engine (Zod strict, Vitest)
│   └── onp-spec/  → @ade/onp-spec, motor spec-anchored em EN (zero deps, bin onp-spec)
├── .github/
│   ├── workflows/ci.yml
│   └── dependabot.yml
├── CHECKPOINT.md
└── README.md
```
