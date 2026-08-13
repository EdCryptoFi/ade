# opencode skills instaladas neste projeto (.opencode/skills/)

**Estrutura organizada por categoria** (o loader do opencode escaneia `**/SKILL.md` recursivamente):

```
.opencode/skills/
├── graphify/   → knowledge-graph da codebase (1 skill)
├── design/     → design por marca / direção de frontend (3 skills)
├── eng/        → engenharia: api, ADR, segurança, testes, migrações (8 skills)
└── gsd/        → Get Shit Done: 71 skills de workflow spec-driven
```

## Fontes (B)

### 1. Graphify — `Graphify-Labs/graphify` (branch `v8`)
- **Skill:** `.opencode/skills/graphify/SKILL.md` (de `graphify/skill-opencode.md`) + `references/` (8 arquivos do harness opencode).
- **CLI:** venv `/opt/homebrew/var/graphify-venv/bin/graphify` (Homebrew bloqueia pip do sistema por PEP 668).
  - Se o `graphify` não estiver no PATH: `export PATH="/opt/homebrew/var/graphify-venv/bin:$PATH"`
- Gera `graphify-out/` no projeto.

### 2. Awesome Design.md — `VoltAgent/awesome-design-md`
- **Skill wrapper:** `.opencode/skills/design/awesome-design-md/SKILL.md` + `references/design-md/<site>.md` (17 sites: vercel, linear, stripe, supabase, notion, apple, spotify, figma, cursor, miro, slack, sentry, posthog, airbnb, warp, raycast, opencode).
- Complementa a skill global `ui-ux-pro-max` (decisão) com tokens concretos por marca.

### 3. Get Shit Done (GSD) — `gsd-build/get-shit-done` (arquivado → `open-gsd/gsd-core`)
- **Instalado via:** `npx -y @opengsd/gsd-core@latest --opencode --local` (v1.9.1).
- Instalou: `skills/gsd/` (71), `agents/` (34), `commands/` (71), `plugins/gsd-core.js`, `hooks/` (filtrados), `scripts/` (filtrado), `opencode.json`, `gsd-core/` (runtime 8MB — necessário: `gsd_run` → `gsd-core/bin/gsd-tools.cjs`).
- MCP `gsd` local (`npx -y -p @opengsd/gsd-core gsd-mcp-server`).
- Não copie skills do repo à mão — frontmatter é Claude-schema; use o installer.

### 4. Everything Claude Code (ECC) — `affaan-m/everything-claude-code`
- **8 skills** em `skills/eng/`: `api-design`, `architecture-decision-records`, `security-review`, `e2e-testing`, `database-migrations`, `hexagonal-architecture`, `codebase-onboarding`, `prompt-optimizer`.
- Frontmatter já é opencode-compatível.

## Filtragem aplicada (limpeza pós-instalação)
Removidos os artefatos de **outros harnesses / tooling de release** que o opencode não usa:
- Hooks de **cursor** (6) e **windsurf** (2) + `hooks/lib/cursor-workspace.js` — o plugin `gsd-core.js` só invoca 11 hooks opencode.
- `scripts/changeset/` (release tooling do GSD) — mantidos apenas `fix-slash-commands.cjs` (usado pelo plugin) e `lib/cli-exit.cjs`.
- Artefatos de runtime do GSD continuam gitignored: `gsd-file-manifest.json`, `gsd-install-state.json`, `.gsd-profile`, `gsd-migration-journal/`.

## Como revalidar
```bash
ls .opencode/skills/            # graphify/ design/ eng/ gsd/ → 83 skills
# cada uma tem SKILL.md com frontmatter name + description
```
Depois de mudar config/skills, **reinicie o opencode** (config não hot-reload).