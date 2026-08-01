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
apps/mcp/     → MCP Server (16 tools, 4-step wizard, security audit)
apps/site/    → Next.js playground
packages/ade-core/ → Core engine (zero runtime deps, Zod + Vitest)
```

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
