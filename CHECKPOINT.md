# ADE — Checkpoint

**Date:** 03 Aug 2026
**Version:** v0.1
**Branch:** main (28 commits → +1)
**Last commit:** `4eff190` docs: sync README structure with 19 MCP tools and onp-spec engine

---

## Current State

Green suite across the whole monorepo after the full Zero-Trust audit.

- **onp-spec** (`packages/onp-spec`, `@ade/onp-spec`, zero deps): spec-anchored engine 100% in English. **236/236 tests passing.** Typecheck clean.
- **MCP** (`apps/mcp`): **19 tools** (16 ADE + 3 spec: `ade-spec-audit`, `ade-spec-status`, `ade-spec-scaffold`). Hardened (see below).
- **Core** (`packages/ade-core`): **56/56 tests** (5 files), `strict` schemas + limits.
- **API** (`apps/api`): **6/6 security tests** (rate limit, CORS, headers).
- **Site** (`apps/site`): **10/10 tests** (features, format, api client), Next.js build ok, container/presentation.
- Workspace suite: `pnpm -r typecheck` ok (tsc api/mcp/site + 242 onp-spec tests).

## Security Phase — Hardening Applied (Zero-Trust Audit)

- **API** (`apps/api/src/security.ts` new): sliding-window rate limiter 30 req/60s per IP + per API key (in-memory fallback; supports Workers `RATE_LIMITER` binding), 429 with `Retry-After`; CORS allowlist (`ALLOWED_ORIGINS`, default `https://ade-vibe.vercel.app,http://localhost:3000`); security headers (`nosniff`, `X-Frame-Options: DENY`, HSTS, Referrer-Policy, Permissions-Policy, no-store); generic 500 errors with full server-side logging; `/schema` endpoint.
- **Core** (`validation.ts`): `ProjectInputSchema` and `PartialProjectInputSchema` now `.strict()` (mass assignment rejected — LAW-2), `features` `max(50)` + items `min(1).max(200)`, `users` `max(1_000_000_000)` (LAW-3).
- **MCP** (`apps/mcp/src/index.ts`): session ids via `randomUUID()` (`proj_<uuid>`, regex-validated); input clamps (`MAX_DESCRIPTION=2000`, `MAX_DOMAIN=100`, `MAX_FEATURE_LEN=200`, `MAX_FEATURES=50`); `sanitizeFeatureFlags` with whitelist (unknown feature → safe error); silent `catch {}` removed (structured logs `{scope, tool, error}`); tool errors return `{isError: true}` with safe message. `sessions.json` added to `.gitignore` (LAW-11).
- **Site** (`apps/site`): refactored to container/presentation (`components/ProjectForm.tsx`, `ResultViewer.tsx`, `PlaygroundContainer.tsx`; pure logic in `lib/features.ts`, `lib/format.ts`, `lib/api.ts`); API URL via `NEXT_PUBLIC_ADE_API_URL` (no hardcoded host); security headers in `next.config.ts`.
- No hardcoded secrets in the repo; `.env` gitignored; workflows use GitHub secrets.

## Decisions / Constraints Kept in the Translation

- Finding codes (AC_SEM_TESTE, AC_SEM_PROVA, TESTE_ORFAO, ...) DO NOT change.
- CLI commands/flags (`--modelo`, `--esforco`, `--faixa`, ...) and generated filenames (executar-tarefas.sh, plano-execucao.*, sinais.json, licoes.json) DO NOT change.
- Internal ledger identifiers (`concluidas`, `pendentes`, timeline `inicio/ferramenta/saida`) remain PT by design.
- Canonical PT→EN glossary: Given/When/Then, Assumptions/Open Questions, draft|ready|in-implementation|implemented|audited, open|confirmed|invalidated, pending|in-progress|done, MUST|SHOULD|MAY, verification(test|forbidden|required|gate), Files:|Model:|Effort:, severity error|warning, VERIFY_FAILED|VERIFY_SKIPPED.

## Possible Next Steps

1. **Add security tests to CI** — today CI runs only `pnpm turbo typecheck` + `pnpm --filter @ade/core test`; add api/site tests and onp-spec.
2. **Publish to npm** — `@ade/onp-spec` and `@ade/ade-core`
3. **More tradeoff categories** — mobile, analytics, messaging, cache
4. **LLM-powered recommendations** — integrate OpenAI/Claude for contextual recommendations
5. **Scaffolding tests** — validate that generated files compile
6. **Plugin system** — let communities add custom decisions

## How to Resume

```bash
cd "$(git rev-parse --show-toplevel)"
pnpm install
pnpm turbo typecheck
pnpm --filter @ade/onp-spec test        # 236 tests
pnpm --filter @ade/core test            # 56 tests
pnpm --filter @ade/api test             # 6 tests (security)
pnpm --filter @ade/site test            # 10 tests
node packages/onp-spec/bin/onp-spec.js help
pnpm --filter @ade/mcp start            # MCP server (stdio)
pnpm --filter @ade/api dev              # Cloudflare Worker
```

## Structure

```
ade/
├── apps/
│   ├── mcp/       → 19 tools (16 ADE + 3 onp-spec), 4-step wizard, sessions.json (gitignored)
│   ├── api/       → Cloudflare Worker (POST /analyze, /audit, GET /health, /schema) + security.ts
│   └── site/      → Next.js playground (container/presentation, pure lib/)
├── packages/
│   ├── ade-core/  → Engine (Zod strict, Vitest)
│   └── onp-spec/  → @ade/onp-spec, spec-anchored engine in EN (zero deps, bin onp-spec)
├── .github/
│   ├── workflows/ci.yml
│   └── dependabot.yml
├── CHECKPOINT.md
└── README.md
```
