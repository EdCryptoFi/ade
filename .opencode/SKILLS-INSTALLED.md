# opencode skills instaladas neste projeto (.opencode/skills/)

## Fontes (B) — instaladas em {Data}: 2026-08-07

### 1. Graphify — `Graphify-Labs/graphify` (branch `v8`)
- **Skill:** `.opencode/skills/graphify/SKILL.md` (copiado de `graphify/skill-opencode.md`) + `references/` (8 arquivos do harness opencode).
- **CLI:** instalado num venv dedicado: `/opt/homebrew/var/graphify-venv/bin/graphify` (Homebrew bloqueia pip do sistema por PEP 668).
  - Uso: `/opt/homebrew/var/graphify-venv/bin/graphify <command>`.
  - O skill invoca `graphify` no PATH — se não achar o binário, export PATH:
    `export PATH="/opt/homebrew/var/graphify-venv/bin:$PATH"`
- Sobrescreve/conflita? Não. Gera `graphify-out/` no projeto.

### 2. Awesome Design.md — `VoltAgent/awesome-design-md`
- **Skill wrapper:** `.opencode/skills/awesome-design-md/SKILL.md` (feito à mão).
- **Reference docs:** `.opencode/skills/awesome-design-md/references/design-md/<site>.md` (17 sites: vercel, linear, stripe, supabase, notion, apple, spotify, figma, cursor, miro, slack, sentry, posthog, airbnb, warp, raycast, opencode).
- Não é skill nativa — é coleção de DESIGN.md. Aponta pra `references/design-md/`.

### 3. Get Shit Done (GSD) — `gsd-build/get-shit-done` (arquivado → `open-gsd/gsd-core`)
- **Instalado via:** `npx -y @opengsd/gsd-core@latest --opencode --local` (v1.9.1).
- Instalou: `skills/` (71 `gsd-*`), `agents/` (34), `commands/` (71), `plugins/gsd-core.js`, `hooks/`, `scripts/`, `opencode.json`, `settings.json`.
- Adicionou MCP `gsd` local (`npx -y -p @opengsd/gsd-core gsd-mcp-server`) em `.opencode/opencode.json`.
- Não copie skills do repo à mão — frontmatter é Claude-schema; use o installer.

### 4. Everything Claude Code (ECC) — `affaan-m/everything-claude-code`
- **10 skills selecionadas** copiadas de `skills/<name>/SKILL.md`:
  `api-design`, `architecture-decision-records`, `frontend-design-direction`, `hexagonal-architecture`, `design-system`, `codebase-onboarding`, `prompt-optimizer`, `e2e-testing`, `database-migrations`, `security-review`.
- Frontmatter já é opencode-compatível (`name`+`description`+`metadata`).
- Não rodar `--profile full` (instala hooks/agents 282 skills — overkill).

## Sobreposições a vigiar
- `ap design` (ECC) × `security-review` (ECC) × skills de design da própria collection — ok conviver.
- `ui-ux-pro-max` (global `~/.claude/skills`) × `awesome-design-md` + `frontend-design-direction`: complementares (um dá decisão de design, outro dá token defunto por marca).

## Como revalidar
```bash
ls .opencode/skills/                                                   # 83 skills
# cada um tem SKILL.md com frontmatter name + description
```
Depois de mudar config/skills, **reinicie o opencode** (config não hot-reload).