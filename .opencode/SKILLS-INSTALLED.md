# opencode skills installed in this project (.opencode/skills/)

**Structure organized by category** (the opencode loader scans `**/SKILL.md` recursively):

```
.opencode/skills/
├── graphify/   → codebase knowledge-graph (1 skill)
├── design/     → design by brand / frontend direction (3 skills)
├── eng/        → engineering: api, ADR, security, tests, migrations (8 skills)
└── gsd/        → Get Shit Done: 71 spec-driven workflow skills
```

## Sources

### 1. Graphify — `Graphify-Labs/graphify` (branch `v8`)
- **Skill:** `.opencode/skills/graphify/SKILL.md` (from `graphify/skill-opencode.md`) + `references/` (8 files from the opencode harness).
- **CLI:** venv `/opt/homebrew/var/graphify-venv/bin/graphify` (Homebrew blocks system pip via PEP 668).
  - If `graphify` is not on PATH: `export PATH="/opt/homebrew/var/graphify-venv/bin:$PATH"`
- Generates `graphify-out/` in the project.

### 2. Awesome Design.md — `VoltAgent/awesome-design-md`
- **Skill wrapper:** `.opencode/skills/design/awesome-design-md/SKILL.md` + `references/design-md/<site>.md` (17 sites: vercel, linear, stripe, supabase, notion, apple, spotify, figma, cursor, miro, slack, sentry, posthog, airbnb, warp, raycast, opencode.ai).
- Complements the global `ui-ux-pro-max` skill (installed at `~/.claude/skills/`, outside this repo) with concrete per-brand tokens.

### 3. Get Shit Done (GSD) — `gsd-build/get-shit-done` (archived → `open-gsd/gsd-core`)
- **Installed via:** `npx -y @opengsd/gsd-core@latest --opencode --local` (v1.9.1).
- Installed: `skills/gsd/` (71), `agents/` (34), `commands/` (71), `plugins/gsd-core.js`, `hooks/` (filtered), `scripts/` (filtered), `opencode.json`, `gsd-core/` (8MB runtime — required: `gsd_run` → `gsd-core/bin/gsd-tools.cjs`).
- Local `gsd` MCP (`npx -y -p @opengsd/gsd-core gsd-mcp-server`).
- Do not copy repo skills by hand — frontmatter is Claude-schema; use the installer.

### 4. Everything Claude Code (ECC) — `affaan-m/everything-claude-code`
- **8 skills** in `skills/eng/`: `api-design`, `architecture-decision-records`, `security-review`, `e2e-testing`, `database-migrations`, `hexagonal-architecture`, `codebase-onboarding`, `prompt-optimizer`.
- Frontmatter is already opencode-compatible.

## Filtering applied (post-install cleanup)
Removed artifacts of **other harnesses / release tooling** that opencode does not use:
- **cursor** (6) and **windsurf** (2) hooks + `hooks/lib/cursor-workspace.js` — the `gsd-core.js` plugin only invokes 11 opencode hooks.
- `scripts/changeset/` (GSD release tooling) — kept only `fix-slash-commands.cjs` (used by the plugin) and `lib/cli-exit.cjs`.
- GSD runtime artifacts remain gitignored: `gsd-file-manifest.json`, `gsd-install-state.json`, `.gsd-profile`, `gsd-migration-journal/`.

## How to re-validate
```bash
ls .opencode/skills/            # graphify/ design/ eng/ gsd/ → 83 skills
# each has a SKILL.md with name + description frontmatter
```
After changing config/skills, **restart opencode** (config does not hot-reload).
