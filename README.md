# ADE — Architecture Decision Engine

Camada de arquitetura para Vibe Coding. Decide a arquitetura **antes** do código ser escrito.

## Links de produção

- **Playground:** https://ade-vibe.vercel.app
- **API (Cloudflare Worker):** https://ade-api.cryptolairbr.workers.dev (`POST /analyze`, `POST /audit`, `GET /health`, `GET /schema`)

## Quick Start

```bash
pnpm install
pnpm --filter @ade/core test
```

## MCP Server (recomendado)

Configure no `.opencode.json` ou `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ade": {
      "command": "pnpm",
      "args": ["--filter", "@ade/mcp", "start"],
      "workdir": "/caminho/para/ade"
    }
  }
}
```

16 ferramentas MCP: wizard, tradeoffs, scaffold, settings, plan, security audit, e análises individuais.

## Estrutura

```
apps/api/     → Cloudflare Worker (POST /analyze, POST /audit)
apps/mcp/     → MCP Server (16 tools, wizard 4 passos, security audit)
apps/site/    → Next.js playground
packages/ade-core/ → Engine principal (zero deps runtime, Zod + Vitest)
```

## Security Audit

`POST /audit` e a tool MCP `ade-security-audit` executam uma auditoria Zero-Trust Universal:

- **15 Leis Imutáveis** organizadas em 4 camadas (perímetro, identidade, negócio, infraestrutura)
- **12 Vetores de Ataque** (IDOR, race conditions, SSRF, injection, secrets, RLS...)
- **10 Anti-Padrões de Vibe Coding** (A1-A10) — segurança só no cliente, auth removido, RLS desabilitado, middleware fantasma...
- **Scorecard** (nota A-F) + Top 3 ações prioritárias
- **Security TDD** — testes gerados para cada vulnerabilidade aplicável

Cada check inclui classificação (OWASP + CWE), exploit Red Team, mitigação Blue Team e testes.

## Stack

Turborepo | TypeScript | Zod | Vitest | Prettier
Next.js | Supabase | Vercel | MCP SDK | Cloudflare Workers

## Licença

MIT
