# ADE — Architecture Decision Engine

An architecture layer for Product Engineering. Decides the architecture **before** the code is written — by humans or by AI.

## Production Links

- **Playground:** https://ade-vibe.vercel.app
- **API (Cloudflare Worker):** https://ade-api.cryptolairbr.workers.dev (`POST /analyze`, `POST /audit`, `GET /health`, `GET /schema`)

## Quick Start

```bash
pnpm install
pnpm --filter @ade/core test        # architecture engine (56 tests)
pnpm --filter @ade/onp-spec test    # spec-driven engine (236 tests)
pnpm --filter @ade/api test         # worker hardening (rate limit, CORS, headers)
pnpm --filter @ade/site test        # site libs (payload build, flatten, api client)
```

## MCP Server (recommended)

Configure in `.opencode.json` or `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ade": {
      "command": "pnpm",
      "args": ["--filter", "@ade/mcp", "start"],
      "workdir": "/path/to/ade"
    }
  }
}
```

19 MCP tools: wizard, tradeoffs, scaffold, settings, plan, security audit, individual analyses, and the spec-driven tools (ade-spec-audit/status/scaffold).

## Structure

```
apps/api/     → Cloudflare Worker (POST /analyze, POST /audit)
apps/mcp/     → MCP Server (19 tools, 4-step wizard, security audit, spec-driven audit)
apps/site/    → Next.js playground
packages/ade-core/ → Architecture engine (zero runtime deps, Zod + Vitest)
packages/onp-spec/ → Spec-driven engine: specs auditable against code, DoD, explicit assumptions (MIT, from onp-spec-driven)
```

## Spec-Driven Development

`packages/onp-spec` (from [onp-spec-driven](https://github.com/onovoprogramador/onp-spec-driven)) is a zero-dependency engine for spec-anchored development: the spec stays true as code evolves.

```
onp-spec init [--preset base|lgpd-educacao] [--agents claude|codex|cursor]
onp-spec new <feature>        # spec.md + tasks.md under .spec/features/<feature>/
onp-spec scaffold <feature>   # one failing test per acceptance criterion
onp-spec plano <feature>      # parallel lanes + execution artifacts
onp-spec verify <feature>     # test runner records proof of each AC
onp-spec audit [--ci]         # spec ↔ tasks ↔ tests ↔ code ↔ constitution (exit 1 on error)
```

Programmatic API: `loadProject`, `auditProject`, `runVerify`, `scaffoldTests`, `parseSpec`, `parseTasks` (see `packages/onp-spec/src/index.js`).

Exposed via MCP: `ade-spec-audit`, `ade-spec-status`, `ade-spec-scaffold` (point `rootDir` at any project with `.spec/`). Working example: `packages/onp-spec/examples/inscricao-turma/`.

## Security Audit

`POST /audit` and the `ade-security-audit` MCP tool run a Universal Zero-Trust audit:

- **15 Immutable Laws** organized in 4 layers (perimeter, identity, business, infrastructure)
- **12 Attack Vectors** (IDOR, race conditions, SSRF, injection, secrets, RLS...)
- **10 Vibe Coding Anti-Patterns** (A1-A10) — client-only security, removed auth, disabled RLS, phantom middleware...
- **Scorecard** (A-F grade) + Top 3 priority actions
- **Security TDD** — tests generated for every applicable vulnerability

Each check includes classification (OWASP + CWE), Red Team exploit, Blue Team mitigation and tests.

## Platform Hardening

The runtime itself (API, MCP server, site) follows the same zero-trust posture:

- **Rate limiting** — API: 30 req/60s per IP via in-memory sliding window (or the `RATE_LIMITER` Worker binding when configured), 429 + `Retry-After` on excess.
- **Input validation** — `@ade/core` schemas are `strict` (unknown keys rejected, LAW-2) with explicit caps: 50 features, 200 chars/feature, 1B users. MCP clamps free-text fields (`MAX_DESCRIPTION=2000`, `MAX_DOMAIN=100`).
- **API keys** — no hardcoded secrets in the repo; `.env` is gitignored; CI/deploy workflows read GitHub secrets (`CF_API_TOKEN`, `VERCEL_TOKEN`, ...).
- **Session ids** — MCP sessions use `randomUUID()` (`proj_<uuid>`); anything else (e.g. path traversal) is rejected with a safe error.
- **Mass assignment** — MCP feature flags are whitelisted against known keys; unknown flags throw (`Unknown feature: X`).
- **Safe errors** — full details are logged server-side with tool context; models/clients receive generic `Error: <message>` (no stack traces).
- **Site** — playground is container/presentation separated; API URL comes from `NEXT_PUBLIC_ADE_API_URL` (no hard-coded host); security headers (`nosniff`, `DENY`, HSTS, Referrer-Policy, Permissions-Policy).
- **CORS** — API allows only `https://ade-vibe.vercel.app` and `http://localhost:3000` by default (override via `ALLOWED_ORIGINS`).
- **Tests** — `pnpm --filter @ade/api test`, `pnpm --filter @ade/site test`, `pnpm --filter @ade/core test` cover the hardening.

## Stack

Turborepo | TypeScript | Zod | Vitest | Prettier
Next.js | Supabase | Vercel | MCP SDK | Cloudflare Workers

## License

MIT
