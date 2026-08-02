# ADE — Architecture Decision Engine

An architecture layer for Product Engineering. Decides the architecture **before** the code is written — by humans or by AI.

## Production Links

- **Playground:** https://ade-vibe.vercel.app
- **API (Cloudflare Worker):** https://ade-api.cryptolairbr.workers.dev (`POST /analyze`, `POST /audit`, `GET /health`, `GET /schema`)

## Quick Start

```bash
pnpm install
pnpm --filter @ade/core test
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

16 MCP tools: wizard, tradeoffs, scaffold, settings, plan, security audit, and individual analyses.

## Structure

```
apps/api/     → Cloudflare Worker (POST /analyze, POST /audit)
apps/mcp/     → MCP Server (19 tools, 4-step wizard, security audit, spec-driven audit)
apps/site/    → Next.js playground
packages/ade-core/ → Core engine (zero runtime deps, Zod + Vitest)
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

## Stack

Turborepo | TypeScript | Zod | Vitest | Prettier
Next.js | Supabase | Vercel | MCP SDK | Cloudflare Workers

## License

MIT
