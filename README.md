# ADE — Architecture Decision Engine

Camada de arquitetura para Vibe Coding. Decide a arquitetura **antes** do código ser escrito.

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

15 ferramentas MCP: wizard, tradeoffs, scaffold, settings, plan, e análises individuais.

## Estrutura

```
apps/api/     → Cloudflare Worker (POST /analyze)
apps/mcp/     → MCP Server (15 tools, wizard 4 passos)
apps/site/    → Next.js playground
packages/ade-core/ → Engine principal (zero deps runtime, Zod + Vitest)
```

## Stack

Turborepo | TypeScript | Zod | Vitest | Prettier
Next.js | Supabase | Vercel | MCP SDK | Cloudflare Workers

## Licença

MIT
