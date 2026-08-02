# Detailed flow — from zero to a clean audit

## Complete example: "homework submission"

> `onp-spec <cmd>` abbreviates `node <this-skill-dir>/scripts/onp-spec.mjs <cmd>`,
> always from the project ROOT (embedded engine — nothing to install).

```bash
# 1. initialize the project (once)
onp-spec init --preset lgpd-educacao

# 2. new feature
onp-spec new entrega-dever-casa
```

Edit `.spec/features/entrega-dever-casa/spec.md`:

```markdown
# Spec: Homework submission

> feature: entrega-dever-casa
> status: in-implementation

## Stories

### US-001 — Student submits on time

As a student, I want to submit my homework before the deadline, so that it counts as on time.

#### AC-001 — Submission before the deadline is "on time"

- **Given** an authenticated student with an open assignment
- **When** they submit the file before the deadline
- **Then** the submission is recorded with status "on time"

#### AC-002 — Submission after the deadline is "late"

- **Given** an authenticated student with an open assignment
- **When** they submit after the deadline
- **Then** the submission is recorded with status "late"

## Assumptions

| ID | Assumption | Status | Resolution |
|---|---|---|---|
| ASM-001 | Homework cannot be resubmitted after grading | open | — |

## Open Questions

| ID | Question | Status | Answer |
|---|---|---|---|
| Q-001 | Which timezone defines the deadline? | open | — |
```

```bash
# 3. each acceptance criterion becomes an executable test (the definition of done)
onp-spec scaffold entrega-dever-casa
# → creates test/entrega-dever-casa.spec.test.js with tests that FAIL
#   (includes skeletons for constitution principles with verification(test))
```

## Parallelizing: `onp-spec plano` (2+ pending tasks)

With the tasks written in `tasks.md` (with honest `Files:`), the engine
assembles the execution plan:

```bash
onp-spec plano entrega-dever-casa
```

- Tasks on **disjoint files** become **parallel lanes**: 1 lane =
  1 git worktree + 1 branch (`spec/<feature>-faixa-N`) + 1 clean context
  window. Tasks sharing a file fall into the same lane, sequentially; a task
  without `Files:` runs alone at the end.
- Optional per-task fields in tasks.md: `- Model: claude-sonnet-5` and
  `- Effort: high` (low|medium|high|xhigh|max) — the plan uses them in the
  executors.
- Always outputs `plano-execucao.md` (lanes, waves, branch/commit management,
  merge order and the final gate). On the **Claude Code** skill it also
  outputs `executar-tarefas.sh` (headless claude in parallel, with
  `--model`/`--effort` per task) and `plano-execucao.html` (visual, with the
  "Run all tasks in clean parallel windows" button). On the **Antigravity**
  skill, the plan brings a ready prompt per lane for the native parallel
  agents.
- Commit management belongs to the plan: **1 task = 1 commit**
  (`T-003 <feature>: <title>`), `--no-ff` merges back into the working branch
  `spec/<feature>`, and the final gate (verify + audit) runs after everything
  is merged.

Regenerate the plan whenever tasks.md or the `paralelo` config changes — the
artifacts warn that they must not be edited by hand.

Now implement the logic and fill in the tests (or let the plan execute). Run:

```bash
# 4. the runner proves (or not) — a SKIPPED test doesn't count as proof
onp-spec verify entrega-dever-casa

# 5. the gate — paste the output; exit 0 or it's not done
onp-spec audit --ci
```

## The status table

Run `onp-spec status` anytime:

```
feature                        status             criteria  with-test  proven  assumptions?  questions?
────────────────────────────────────────────────────────────────────────────────────────────────────────
entrega-dever-casa             in-implementation         2          2       1            1           1
```

It reads: 2 acceptance criteria, both with an annotated test, but only 1
proven so far; 1 assumption and 1 question still open. The feature **cannot**
go to `implemented` with assumption ASM-001 open — the audit will block with
"open assumption" (`ASM_ABERTA`).

## CI integration

In your pipeline (GitHub Actions, GitLab CI):

In CI you can use the same embedded engine (committed together with the skill)
or the `@onovoprogramador/onp-spec` npm package (CI mode):

```yaml
- run: node .claude/skills/onp-spec-driven/scripts/onp-spec.mjs verify entrega-dever-casa
- run: node .claude/skills/onp-spec-driven/scripts/onp-spec.mjs audit --ci
```

## Why this kills vibecoding

The AI agent can't say "I implemented everything" and get away with it: if an
acceptance criterion has no test, the audit flags it; if the test never
passed, the audit flags it; if the agent renamed a requirement and forgot the
test, the audit flags an orphan test (`TESTE_ORFAO`); if the agent SKIPPED the
test (skip/todo), verify refuses the proof and the audit flags a criterion
without proof (`AC_SEM_PROVA`). The proof isn't the agent's word — it's the
exit code.
