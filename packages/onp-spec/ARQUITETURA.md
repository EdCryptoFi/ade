# Architecture — onp-spec-driven

> Internal design document. Updated as the project evolves.
> Build status: see PROGRESS.md

## Thesis

Every existing SDD tool is **spec-first**: the spec generates the code and then becomes a lie.
onp-spec-driven is **spec-anchored**: the spec is mechanically auditable against the code, in CI.

| Competitor | What it does | What it does NOT |
|---|---|---|
| spec-kit (GitHub) | Rich templates (prioritized US, given-when-then, FR-xxx), Python scaffolding CLI | Tests are OPTIONAL in the template; no mechanical verification; constitution is just a prompt |
| OpenSpec | Real structural validator (zod + md parser): SHALL/MUST present, scenarios exist, deltas well-formed | Never links requirement → test → code; does not detect drift |

## The 5 differentiators (product acceptance criteria)

1. **Spec-anchored with total traceability**: US-xxx → AC-xxx → T-xxx → annotated test.
   `onp-spec audit` answers mechanically: "which AC has no test?", "which test points to a nonexistent AC?",
   "which code file maps to no task?".
2. **Executable DoD**: every AC is born as Given/When/Then; `onp-spec scaffold` generates the test skeleton
   with the `@spec:AC-xxx` tag in the title; `onp-spec verify` runs the tests and cross-references results with the ACs.
   The agent can't declare victory: `audit --ci` exits with code ≠ 0 if an AC lacks PASS proof.
3. **Assumptions and questions as first-class citizens**: mandatory `## Assumptions` (ASM-xxx)
   and `## Open Questions` (Q-xxx) sections with status. A feature can't reach `implemented` with an open ASM.
4. **Constitution with verifiable obligation levels**: P-xxx with [MUST]/[SHOULD]/[MAY],
   each MUST with executable verification (test tag `@principle:P-xxx`, forbidden/required pattern via regex+glob).
   LGPD/education preset included (minors' data, grades, access audit).
5. **Lessons learned with mechanical backing**: the AI phrases it; the engine validates that the lesson cites a
   REAL signal from the history (audit finding / verify failure) and owns dedup, promotion by
   recurrence across distinct features, quarantine by penalty, pruning and rendering.

## Stack

- Node.js >= 18, pure ESM, **zero dependencies**.
- Tests of the library itself: native `node:test`.
- **The skill is the main artifact**, self-contained, in FOUR variants with
  the SAME engine and the SAME version (`skills/onp-spec-driven/` for Claude Code,
  `skills/onp-spec-driven-codex/` for Codex, `skills/onp-spec-driven-cursor/`
  for Cursor, `skills/onp-spec-driven-antigravity/` for Antigravity;
  the `agent:` marker in the frontmatter prevents installing the wrong one):
  - `SKILL.md` + `references/` — the agent contract: flow
    Specify → Design → Tasks → Execute → **Audit**, correction loop
    limited to 3 iterations, 1 task = 1 commit, gate with pasted output.
  - `scripts/` — **embedded mechanical engine** (generated from `src/` by
    `node tools/build-skill.mjs`; `test/skill-sync.test.js` flags drift).
    Installing = copying the folder to `.claude/skills/` (Claude Code),
    `.cursor/skills/` (Cursor — native Agent Skills since Cursor 2.4; the
    frontmatter `name:` MUST equal the folder name) or
    `.agents/skills/` (Codex and Antigravity — they share the directory,
    hence the marker). No npm, no npx.
- The **npm CLI** (`bin/onp-spec.js` → `src/`) still exists as a CI mode
  (`@onovoprogramador/onp-spec`); it consumes the SAME `src/`.
- Refactor design (skill-first): `docs/TDD-skill-harness.md`; findings that
  motivated it: `docs/ACHADOS-teste-exaustivo.md`.

## Artifact format (.spec/)

```
.spec/
├── constituicao.md          # P-xxx versioned with executable verification
├── licoes.json              # lessons (canonical state, written only by the engine)
├── LICOES.md                # rendered lessons (human/agent reading)
├── verification/            # verify results per feature (JSON, machine)
│   └── sinais.json          # signal history (backing for lessons)
└── features/<name>/
    ├── spec.md              # US-xxx, AC-xxx (Given/When/Then), ASM-xxx, Q-xxx
    ├── tasks.md             # T-xxx with Refs: and Files:
    └── design.md            # optional (large features)
```

### spec.md (minimal parseable grammar)

```markdown
# Spec: Homework submission
> feature: homework-submission
> status: draft | ready | in-implementation | implemented | audited

## Stories
### US-001 — Student submits homework
As a student, I want..., so that...

#### AC-001 — Submission within the deadline
- **Given** an authenticated student with an open assignment
- **When** they submit the file before the deadline
- **Then** the submission is recorded with status "on time"

## Assumptions
| ID | Assumption | Status | Resolution |
|---|---|---|---|
| ASM-001 | Work cannot be resubmitted | open | — |

## Open Questions
| ID | Question | Status | Answer |
|---|---|---|---|
| Q-001 | Deadline time zone? | answered | America/Sao_Paulo |
```

ASM status: `open | confirmed | invalidated`. Q status: `open | answered`.

### tasks.md

```markdown
## T-001 — Submission Model [done]
- Refs: US-001, AC-001, AC-002
- Files: src/models/submission.js
```

Task status: `pending | in-progress | done`.

### Test annotation (works in ANY framework)

The tag goes in the TEST TITLE (appears in any reporter) and/or in a comment in the file:

```js
test('AC-001: submission on time @spec:AC-001', () => { ... })
// @principle:P-002 in principle tests
```

### constituicao.md

```markdown
# Constitution — v1.0.0

## P-001 [MUST] A student's grade is never exposed to another student
Every endpoint that returns a grade filters by the authenticated student.
- verification(test): @principle:P-001
- verification(forbidden): `SELECT \* FROM notas` in `src/**/*.js`

## P-010 [MAY] Data deletion at the data subject's request
```

## Audit engine — finding catalog

| Code | Finding | Severity |
|---|---|---|
| AC_SEM_TESTE | AC with no annotated test | error |
| AC_SEM_PROVA | Test exists but never passed in verify (failed, was SKIPPED — skip is not proof — or outdated verify) | error in --ci, warning otherwise |
| TESTE_ORFAO | Test annotated with a nonexistent AC (drift!) | error |
| REF_QUEBRADA | Task references a nonexistent US/AC in ANY spec (IDs/refs are global) | error |
| US_SEM_AC | Story without acceptance criterion | error |
| AC_INCOMPLETO | AC without complete Given/When/Then | error |
| AC_SEM_TASK | No task (from any feature) covers the AC | warning |
| ARQUIVO_ORFAO | src file not mapped by any task (configurable globs) | warning |
| ARQUIVO_INEXISTENTE | Task maps a file that doesn't exist | error if [done], warning otherwise |
| TASK_CONCLUIDA_SEM_PROVA | Task [done] with an AC without PASS | error |
| TASK_SEM_STATUS | Task without explicit status (assumed pending) | warning |
| TASK_STATUS_INVALIDO | Task status outside pending/in-progress/done (accents/uppercase are normalized first) | error |
| ASM_ABERTA | Open assumption with an implemented/audited feature | error |
| Q_ABERTA | Open question during implementation | warning |
| SECAO_AUSENTE | Spec without an Assumptions/Open Questions section | error with status ≥ ready, warning in draft |
| PRINCIPIO_SEM_VERIFICACAO | P [MUST] without executable verification | error |
| PRINCIPIO_VIOLADO | Forbidden pattern found / missing test tag | error |
| NIVEL_INVALIDO | Principle level outside MUST/SHOULD/MAY (treated as MUST, never ignored) | error |
| GLOB_SEM_ARQUIVOS | Constitution verification with a glob matching no file (inert) | warning |
| VERIFICACAO_MALFORMADA | Invalid regex, wrong format or regex that exceeded the timeout (5s, subprocess) | error |
| FEATURE_DIVERGENTE | `> feature:` differs from the directory name | warning |
| PROVA_FRACA | Proof granted only by the global exit code (exitcode reporter) | warning |
| ID_DUPLICADO | Two elements with the same ID | error |
| ID_CURTO | ID with fewer than 3 digits in a heading (not recognized by the grammar) | warning |
| VERIFY_OBSOLETO | Code changed after the last verify | warning |

Proof rules (verify): TAP `# SKIP`/`# TODO` directives and JSON statuses
`skipped`/`pending`/`todo` become verdict `skip` — never proof. By tag:
`fail` beats `pass`, which beats `skip`. The `exitcode` reporter only grants
proof to an AC with an annotated test, and always with the PROVA_FRACA warning.

## verify — test result adapters

`onpspec.config.json` → `{ "testCommand": "...", "reporter": "tap" | "vitest-json" | "jest-json" | "exitcode" }`.
Verify runs the command, extracts PER-TEST results, matches titles with `@spec:AC-xxx` and writes
`.spec/verification/<feature>.json` with per-AC `status`/`testName`/`method`, plus `timestamp` and `gitRev`.
Audit consumes that.

## Execution plan (src/core/plano.js)

`onp-spec plano <feature>` turns tasks.md into execution lanes:
tasks with **disjoint** `Files:` become PARALLEL lanes (connected
components of the file-conflict graph — 1 lane = 1 git worktree + 1
branch `spec/<feature>-faixa-N` + 1 clean context window); tasks that
share a file fall into the same lane in sequence; a task without `Files:`
runs alone at the end, on the main tree. `paralelo.maxParalelas` (config,
default 3) divides the lanes into waves. `Model:`/`Effort:` per task (or
`paralelo.model`/`paralelo.esforco` defaults) feed the executor.

The computation is agent-agnostic; the artifacts vary (`--agents`, with
auto-detection: 1st the `agent:` marker of the embedded skill itself, 2nd the
engine path (`.codex`/`.cursor/skills`/`.agents`/`.claude` — a checkout in
`~/.cursor/worktrees/<repo>` does NOT count as cursor), 3rd the skill installed
in the project with `.claude` → `.agents` → `.cursor` precedence; with more
than one skill installed, that order wins — in doubt, use the flag):

- **always**: `plano-execucao.md` — lanes/waves, branch and commit
  management (1 task = 1 commit `T-xxx <feature>: title`; `--no-ff` merge onto
  the working branch `spec/<feature>`; final verify + audit gate).
- **claude**: `executar-tarefas.sh` (headless: `claude -p` per task with
  `--model`/`--effort` + `--output-format stream-json --verbose`,
  permission-mode `paralelo.permissionMode` default acceptEdits + allowedTools
  derived from testCommand; validates environment and clean tree; auto-commits
  plan artifacts; merges, marks `[done]` via `onp-spec tarefa`, closes
  the accounting in git and runs the gate) and `plano-execucao.html` (visual,
  read-only).

  The script is a **dispatcher**, not a linear runbook: each lane and each
  sequential is a function, so `--faixa <id>` re-runs only the one that failed
  (cleaning the worktree and branch of the previous attempt before recreating),
  `--seq <T-xxx>` redoes a sequential, `--gate` runs only the verdict and
  `--listar` shows the targets. Each attempt is counted and goes to the ledger.
  While it runs, a background loop prints to the terminal, every ~1 min, the
  **general progress summary** (via `claude -p`, model `paralelo.resumoModel`
  default haiku; deterministic fallback) and records it to the ledger — on exit,
  a trap (`pkill -P` on the loop, otherwise the orphaned `sleep` holds the
  stdout of whoever called it via pipe) records the final summary.
- **codex**: SAME artifacts and SAME dispatcher as claude, swapping the CLI:
  each task runs `codex exec` with `--model` +
  `-c model_reasoning_effort=<level>` (the `max` level in tasks.md becomes
  `xhigh`, Codex's ceiling), `--json` output (JSONL → task stream in the
  ledger), sandbox `paralelo.sandbox` (default `workspace-write`) and
  `--add-dir <repo>` — the shared worktrees `.git` lives in the main repo and
  without it the sandbox would block the commit. The per-minute summary uses
  `codex exec --sandbox read-only --ephemeral` with a cheap model
  (`gpt-5.6-luna` while `paralelo.resumoModel` is still a `claude-*`); the
  per-task model default becomes `gpt-5.6-terra` when `paralelo.model`
  is a `claude-*` (an explicit `Model: claude-*` in tasks.md is swapped with
  a warning; `--modelo claude-*` on the flag is an ERROR). Never depends on the Claude CLI.

  **Cost is the user's choice**: the codex `plano` prints "models and
  efforts of this plan" (line per task) and the skill forces the agent to
  CONFIRM with the user before executing. `--modelo <m>`/`--esforco <n>`
  on `plano` lock ALL tasks (they beat tasks.md and config; they go into
  `modeloForcado`/`esforcoForcado` in plano.json and in the "Regenerate with");
  `onp-spec tarefa <feature> <T-xxx> [status] [--modelo <m>] [--esforco <n>]`
  writes `- Model:`/`- Effort:` in the task's section in tasks.md (replaces if
  it exists, inserts if not) for per-task adjustment.
- **cursor**: SAME artifacts and SAME dispatcher as claude, swapping the CLI:
  each task runs the Cursor CLI (`agent -p`, falling back to the legacy name
  `cursor-agent`) with `--model` per task, `--output-format stream-json`
  output (NDJSON → task stream in the ledger) and `--force` — without
  `--force` Cursor's print mode doesn't modify files; fine-grained control is
  the user's via `permissions.deny` in `.cursor/cli.json`, which beats
  `--force`. **There is no effort flag in the Cursor CLI**: the level goes
  embedded in the model slug (e.g. `gpt-5.6-terra-high`), so the tasks.md
  `Effort:` is informational on this plan (the artifact warns). `claude-*`
  models are VALID slugs in Cursor — nothing is swapped; only the per-minute
  summary model becomes `composer` (the house model, included usage) while
  `paralelo.resumoModel` is the default `claude-haiku-4-5`. The per-minute
  summary runs `agent -p` WITHOUT `--force` (read-only by construction).
  The plan prints "models of this plan" and the skill forces the agent to
  CONFIRM with the user before executing (claude-*/gpt-* are billed per
  usage on the Cursor plan; the economy route is `--modelo composer`). Never
  depends on the Claude nor the Codex CLI.
- **antigravity**: the md gains worktree commands and a ready-made prompt per
  lane for the native parallel agents — never depends on any CLI.

**Parallelizing is the user's choice — including WHICH tasks**: the agent
presents the plan as a recommendation and asks before executing.
`--paralelizar T-001,T-003` restricts the lanes to the CHOSEN tasks (the
rest go to `sequenciais` with `motivoSeq` "outside the user's selection";
unknown id or empty selection is a friendly error; the selection shows up in
`paralelizar` in plano.json and in the "Regenerate with" of the artifacts).
`--sequencial` generates the plan with ALL tasks in `sequenciais` (one after
another, on the main tree, without worktrees — `modo: "sequencial"` in
plano.json), reusing the same executor, the same commit discipline and the
same gate.

`onp-spec tarefa <feature> <T-xxx> <status>` is the mechanical status-update
utility used by the executor (and by humans).

The plan also comes out in `plano.json` (machine reading) and the script emits
an event trail (lane running/merged/conflict, tasks, gate, end, summary) to
the global ledger — that's what feeds `onp-spec resumo`.

## Global ledger (src/core/ledger.js)

Execution state does NOT live in the user's repository: it lives in a **single,
global file**, `~/.onp-spec/painel/ledger.jsonl` (root configurable by
`ONP_SPEC_HOME`, which also isolates the tests; the `painel/` segment in the
path is historical inheritance). Each line is an event (`plano`, `start`,
`faixa`, `tarefa`, `gate`, `end`, `resumo`) stamped with `runId`,
`projeto`, `projetoDir` and `feature` — so one ledger covers as many projects
as exist, and `montarArvore()` rebuilds project → execution → lane →
task from it. `podarLedger()` keeps the 30 most recent executions and
deletes the streams of the old ones. A corrupted line is ignored, never takes
down the read.

Honesty rule baked into the tree: **new work invalidates the previous verdict**
(`gateDesatualizado`), so an execution only shows "done" with a fresh audit at
0. The `--sem-gate` records `fim: 1` on purpose — without an audit there is no
proof.

Each task's stream is the raw JSONL of the headless CLI — `claude -p
--output-format stream-json --verbose` (system/assistant/user/result events),
`codex exec --json` (thread.started/turn.*/item.* events — items
agent_message, reasoning, command_execution, file_change, mcp_tool_call,
web_search, todo_list) or the Cursor CLI `agent -p --output-format
stream-json` (system/init, assistant and result in the SAME shape as claude;
tools as tool_call started/completed events with body in
`tool_call.<name>ToolCall`, without usage nor thinking in print mode) — in
`~/.onp-spec/painel/streams/<runId>/<faixa>--<T-xxx>.jsonl`.
`resumirStream()` translates any of the three into the SAME timeline
(`inicio`, `ferramenta`, `pensando`, `saida`, `texto`, `fim`) with size
trimming and incremental reading by line cursor. Honest note: in headless the
`thinking` block usually comes redacted (empty + signature); the
`system/thinking_tokens` count shows the activity without inventing reasoning.

## General progress summary (src/core/resumo.js)

`onp-spec resumo [feature]` is the "what's going on right now?" answer in
text — the agent posts that paragraph to the chat every ~1 min while an
execution runs; **there is no server nor web UI**: the tracking is chat and
terminal, by product decision. `--tabela` (`tabelaAndamento()`) prints the
**progress table** in markdown — one line per task (where it runs, status
⏳/▶️/✅/❌ and the last action from the stream; cells sanitized of pipes and
line breaks), with a footer of failed lanes and the gate — ready for the agent
to paste in the chat along with the text; the execution runs in the background
and the user receives the full summary at the end.

Two origins, always labeled: `ai` (the claude/codex executor records via
`resumo --gravar --origem ai --texto`; in Antigravity it's the agent itself
that writes) and `engine` (deterministic: `resumoDeterministico()` narrates
the ledger tree — done, task in execution with the last action from the stream
via `ultimaAcao()` (cheap NDJSON tail), failures/conflicts and the gate).
Freshness rule in `montarResumoAtual()`: an AI summary older than 2 min loses
to the engine's — a stale text claiming "running" would be a lie. `--contexto`
prints the mechanical state the narrator model consumes.

## Lessons layer (src/core/sinais.js + src/core/licoes.js)

The agent brings the judgment (phrasing the general rule); the engine owns
everything mechanical. Two files, both written only by the engine:

- `.spec/verification/sinais.json` — **signal history**: every `audit`
  finding and every `verify` failure/skip (VERIFY_FAILED/VERIFY_SKIPPED) becomes
  an entry keyed by `(codigo, feature, ref)` with an occurrence count.
  Keyed, not append-only: it grows with distinct failure points, not with
  executions. Automatic compaction by window (`janelaDias`, default 90) and
  ceiling (`maxSinais`, default 20000, keeping the most recent).
- `.spec/licoes.json` (+ rendered `LICOES.md`) — the lessons.

Life cycle of a lesson:

| Transition | Decider | Rule |
|---|---|---|
| — → recusada | engine | `LICAO_SEM_LASTRO`: no `(sinal, feature, fonte)` signal in the history; text > 280 chars is also rejected |
| — → candidata | engine | valid backing; exact-after-normalization dedup (NFD without accents, lowercase, without punctuation) by `sinal::texto` |
| candidata → confirmada | engine | recurrence in `limiarPromocao` (default 2) DISTINCT features — only confirmed ones enter the guide |
| confirmada → quarentena | engine | `limiarQuarentena` (default 2) penalties via `licoes penalizar` |
| candidata → podada | engine | stagnant beyond `janelaDias` without corroborating |

`licoes sugerir` reverses the flow: it groups the history by signal code and
points out those that recurred across `limiarPromocao`+ distinct features with
few associated lessons — the engine says WHERE a lesson is worth it; the AI
phrases it.

Scale (validated in test/licoes-escala.test.js): listing with a fixed ceiling
(`limiteListagem`, default 10 — context cost doesn't grow with the repo),
hierarchical scope (`cobranca/boleto` matches the `cobranca` filter), evidence
limited to 5 per lesson. Thresholds configurable in `onpspec.config.json`
(`licoes` key). The `licoes` command doesn't load the project — listing the
guide is cheap even with hundreds of features.

## Benchmark (benchmark/ folder)

Real specs from the ONP domain (class enrollment, homework submission, student grades).
For each tool (spec-kit, OpenSpec, onp-spec-driven), the harness:
1. Materializes the SAME real spec in the tool's format.
2. Seeds real defects (removes a test, requirement without coverage, silent assumption, privacy violation, ID drift).
3. Runs the tool's native validator and counts how many defects it detects mechanically.
4. Emits RESULTS.md with detection rate + capabilities matrix + setup time.
