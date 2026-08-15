---
name: onp-spec-driven
description: Native spec-anchored development for Antigravity — the specification stays true because it is mechanically audited against the code. Flow Specify → Design → Tasks → Plan → Execute → Audit → Learn, with traceability story→acceptance criterion→task→test, executable definition of done (each acceptance criterion becomes an annotated test), assumptions and questions as first-class citizens, verifiable constitution (LGPD/education preset), lessons learned with mechanical backing and an execution plan with OPTIONAL PARALLELISM: the agent presents the recommended plan and ALWAYS asks WHICH tasks the user wants to parallelize (lanes with git worktrees + Antigravity's native parallel agents via --paralelizar, or one task after another via --sequencial), warns that the execution runs in background and, during it, posts the progress table in the chat every 1 minute (what is running and what is not) + overall summary — with a full summary at the end. Integration with Artifacts (task.md, implementation_plan.md, walkthrough.md) and Slash Commands (/goal, /grill-me, /schedule, /learn). Mechanical engine EMBEDDED in the skill (zero install — runs with the environment's node). Use when planning features, implementing with verification, or auditing an implementation against the spec. Triggers "specify feature", "new feature", "implement", "audit spec", "verify", "execution plan", "run in parallel", "what has no test", "lessons learned".
license: MIT
metadata:
  author: Vitor Manoel — O Novo Programador
  version: 3.6.0
  agent: antigravity
---

# onp-spec-driven — the specification that stays true (Antigravity)

Most SDD tools are **spec-first**: the spec generates code, the code evolves,
and the spec becomes a lie. This one is **spec-anchored**: the spec is
mechanically audited against the code, all the time. You don't trust that the
agent obeyed — **the machine proves it, via exit code**.

```
┌───────────┐  ┌────────┐  ┌───────┐  ┌───────┐  ┌────────┐  ┌───────┐
│  SPECIFY  │→ │ DESIGN │→ │ TASKS │→ │ PLAN  │→ │EXECUTE │→ │ AUDIT │
└───────────┘  └────────┘  └───────┘  └───────┘  └────────┘  └───────┘
   always      if needed   if large   2+ tasks   always    ALWAYS (gate)
```

## Vocabulary — always speak in simple English

The files use short **tracking codes** (that's what links spec, tasks and tests
in the machine). But with the user you **always speak the full name** — the
code goes in parentheses when you need it:

| Code | The name you use with the user |
|---|---|
| US-xxx | **user story** — who needs it, what they need and why |
| AC-xxx | **acceptance criterion** — observable outcome a test checks |
| T-xxx | **task** — implementation step |
| ASM-xxx | **assumption** — a gap filled with a guess, still unconfirmed |
| Q-xxx | **open question** — a decision the product owner still needs to make |
| P-xxx | **principle** (from the constitution) — non-negotiable project constraint |
| DoD | **definition of done** — the set of acceptance criteria with proof |

Example: say "the acceptance criterion AC-003 (delay notice) still has no
test", never "AC-003 lacks the @spec tag". Never make the user learn the
acronyms to understand what you said.

## Interaction — use the full power of Antigravity

This skill runs natively inside Antigravity. Use the native resources
(Artifacts and Slash Commands) to keep the flow visible and interactive,
without turning into bureaucracy:

- **Explain what you did and where you are**: after EVERY action, say in simple
  English (1) what was done, (2) the path of each file created or changed,
  (3) what the next step is. The user should never need to ask "where's the
  file?" nor "what now?".
- **Task list (tasks Artifact)**: when starting an execution, create and
  maintain Antigravity's task-list Artifact (task.md) with one item per task
  (T-xxx), updating `[ ]`, `[/]`, `[x]` at every step — the user follows
  visually. Let Antigravity resolve where the artifact lives; never assume a
  fixed internal path.
- **Design and decisions (Artifact `implementation_plan.md`)**: in the Design
  phase and the execution plan, write the plan into that artifact with
  `request_feedback = true`. Map the open questions (Q-xxx) and the
  assumptions (ASM-xxx) to force the user's review BEFORE execution. Mention
  they can use `/grill-me` to answer in interview mode.
- **Validation and summary (Artifact `walkthrough.md`)**: when `verify` and
  `audit --ci` come out clean, update the walkthrough with the results, the
  recorded lessons and the mechanical proof (the audit output).
- **Slash Commands** — recommend them at the right moment:
  - `/goal`: to close an entire feature — iterate implementation + `verify`
    + `audit --ci` until exit 0. Persisting is implementing for real; the
    contract rules (below) still apply inside `/goal`.
  - `/grill-me`: interview session to clarify requirements and design
    (resolves Q-xxx and confirms ASM-xxx).
  - `/schedule`: monitor long test suites or background tasks.
  - `/learn`: after solving a hard, project-specific problem, suggest `/learn`
    so Antigravity stores the behavior — on top of the mechanical lessons of
    `onp-spec licoes`.
- **Translate the engine's output**: after each command, summarize in 1–3
  sentences of simple English what the machine said and the next step. Also
  paste the raw output (it's the proof), but never deliver it alone.
- **Respect the advanced user**: if the user shows they know the flow (uses
  the codes, asks for direct commands), cut the didactic explanations and go
  straight to the point. The translation shortens; the rigor (verify + audit)
  never does.

## The embedded engine (zero install)

The mechanical engine lives INSIDE this skill, at `scripts/onp-spec.mjs` —
resolved **relative to this SKILL.md's directory** (never assume a fixed
install path). Nothing to install: no npm, no npx, no global CLI.

All commands run **from the user's project root**:

```bash
node <this-skill-dir>/scripts/onp-spec.mjs <command>
```

Commands: `init [--preset base|lgpd-educacao]` · `new <feature>` ·
`plano <feature> [--agents antigravity] [--paralelizar T-xxx,T-yyy] [--sequencial]` ·
`resumo [feature] [--tabela] [--gravar --origem ai --texto "..."]` ·
`tarefa <feature> <T-xxx> <status>` ·
`scaffold <feature> [--force]` · `verify <feature>` ·
`audit [--ci] [--json] [--md <file>]` · `status` · `assumptions` ·
`licoes <add|list|sugerir|penalizar|status>`.

Below, `onp-spec <command>` is an abbreviation for that invocation.

**Graceful degradation** — if `node` doesn't exist in the environment: perform
the audit manually (re-read spec/tasks/tests crossing each problem in the
catalog below) and label the result, textually, as
**`WEAK PROOF (manual audit)`**. Never present a manual audit as if it were the
mechanical gate.

## Execution contract — non-negotiable

1. **Every acceptance criterion becomes an annotated test** with `@spec:AC-xxx`
   in the title. Without an annotated test, the criterion doesn't exist for the
   machine.
2. **Who decides whether an acceptance criterion passed is the test runner**,
   never you. `onp-spec verify` runs the tests and records the proof. You can't
   declare victory. **A skipped test (skip/todo) is not proof** — the engine
   refuses it and the audit flags it.
3. **The feature only closes when `onp-spec audit --ci` exits with code 0.**
   Running the audit and **pasting the output** is the last step, always — the
   walkthrough.md summarizes, but the proof is the raw output.
4. **Assumptions and open questions are required.** Filled a gap without
   confirming? It's an assumption. Missing information? It's an open question.
   A missing section is also a problem (`SECAO_AUSENTE`) — if there are none,
   write "None." and be suspicious.
5. **The constitution rules.** [MUST] principles are verified; violating them
   breaks the audit. Never fix the principle to "make it pass" — fix the code.
6. **Never weaken, skip or delete a test to pass.** This applies ALSO inside
   `/goal`: "don't give up until exit 0" means iterating the IMPLEMENTATION,
   never loosening the gate. Outside `/goal`, if the audit fails 3 times in a
   row on the same problem, STOP and escalate to the user via
   `implementation_plan.md` with the ranked findings — don't iterate forever or
   bypass the gate.

## Auto-scaling

| Scope | Specify | Design | Tasks | Plan | Execute |
|---|---|---|---|---|---|
| Small (≤3 files) | lean spec | skip | implicit | skip | implement + verify + audit |
| Medium (<10 tasks) | full spec | inline | inline | if 2+ tasks | implement + verify + audit |
| Large (multi-component) | spec + design | design.md | tasks.md | always | per-lane + verify + audit |

**Always required:** Specify and Audit.
**Safety valve:** even skipping Tasks, start Execute by listing the atomic
steps. If more than 5 steps appear, or dependencies between them, STOP and
create `tasks.md` — the phase was skipped by mistake.

## Step by step on Antigravity

### 1. Specify

- **Before writing, load the learned guide**: `onp-spec licoes list` (on a big
  project, filter: `--escopo <domain>`).
- `onp-spec new <feature>` creates `.spec/features/<feature>/spec.md` and
  `tasks.md` with continuous tracking codes (unique across the whole project).
- Write the **user stories (US-xxx)** and the **acceptance criteria (AC-xxx)**
  in Given/When/Then, in language the product owner understands.
- **Record assumptions (ASM-xxx) and open questions (Q-xxx)** with an honest
  status (`open`). User present? Suggest `/grill-me` and record the answers in
  the spec.
- Run `onp-spec audit` and read the problems it points to.
- Writing details: [escrevendo-specs.md](references/escrevendo-specs.md).

### 2. Design (large features)

Write the Artifact `implementation_plan.md` with architecture and components,
`request_feedback = true`. Every non-obvious decision becomes an assumption
(you assumed) or an open question (needs the product owner). Highlight both
lists in the plan.

### 3. Tasks

- **Mechanical anchor first:** write the tasks in
  `.spec/features/<feature>/tasks.md` with `Refs:` (stories/criteria) and
  `Files:` (comma-separated) — that's what the audit and the plan read.
  Optional per-task fields: `Model:` and `Effort:` (low|medium|high|xhigh|max).
- **Visualization afterwards:** mirror the tasks in Antigravity's task-list
  Artifact for `[ ]`/`[/]`/`[x]` tracking.
- **Closed tasks.md? Announce the parallelism and ASK WHICH.** Run
  `onp-spec plano <feature>` and present the plan to the user, unprompted, as a
  RECOMMENDATION: *"X of these Y tasks can run IN PARALLEL, in N lanes — I
  recommend it this way."* Then ask (in chat or via `implementation_plan.md`
  with `request_feedback = true`): **which tasks does the user want to
  parallelize?** — all (the recommendation), a subset, or none (one after
  another). The choice is theirs — never execute without that answer, and never
  keep the parallelism a secret of the engine.

### 4. Execution plan (2+ pending tasks)

- **WHICH tasks to parallelize is the USER's choice — ask before executing**
  (in `implementation_plan.md` with `request_feedback = true`, or directly in
  chat; if you didn't ask in the Tasks phase, ask now). Chose all → use the
  plan as is. Chose a subset → regenerate with
  `onp-spec plano <feature> --paralelizar T-xxx,T-yyy` and follow that one.
  Chose none → regenerate with `--sequencial`. Without an answer, don't
  execute.
- `onp-spec plano <feature>` (if detection gets it wrong, force with
  `--agents antigravity`). The engine groups tasks on **disjoint files** into
  **parallel lanes** — 1 lane = 1 git worktree + 1 branch + 1 clean context
  window — and writes `.spec/features/<feature>/plano-execucao.md` with: the
  worktree commands, **one ready prompt per lane**, the merge order, the commit
  management and the final gate. With `--paralelizar`: only the CHOSEN tasks
  join the lanes (the rest run one after another, at the end). With
  `--sequencial`: one prompt per task, in order, to run on the main tree —
  without worktrees.
- Mirror the summary (lanes or order, branches) in `implementation_plan.md`
  with `request_feedback = true` — the user approves BEFORE executing.
- **Parallel execution uses Antigravity's native agents**: one NEW agent per
  lane (clean window), each in its own worktree, with the plan's prompt. In
  sequential mode, you execute the prompts yourself in order. This skill NEVER
  depends on the Claude CLI — that's for the Claude Code sibling skill.
- **Before executing, WARN — always**: tell the user, in one sentence, that
  the changes will run in **background** (the agents work in their own
  windows), that every 1 minute you'll post the **progress table** in the
  chat, and that at the end they'll get the **full summary** of the execution.
  Only then dispatch the agents.
- **Table + summary every 1 minute (required while it runs)**: post the
  **progress table** in the chat (`onp-spec resumo <feature> --tabela` — one
  line per task: which is running, which isn't, what finished/failed) and a
  short paragraph (2 to 4 sentences, simple English) of what is happening,
  recording it in the ledger: `onp-spec resumo <feature> --gravar --origem ai
  --texto "..."`. No time to write? `onp-spec resumo <feature> --gravar`
  records the engine's summary. The user is never left without knowing what's
  going on.
- **Mark progress in the ledger** (that's what the table and the summary are
  made of): when starting/finishing each task, run the `evento` command that
  plano-execucao.md brings ready (state `running`/`done`/`failed`) and, when
  done, `onp-spec tarefa <feature> <T-xxx> done`.
- **Done? Deliver the full summary**: the final table, what each task did
  (commits), what failed (if anything did) and the gate output (verify + audit)
  pasted and translated into one sentence.
- Small feature or user wants it simple? Execute the lanes yourself, in
  sequence — the plan still works as a branch and commit roadmap.

### 5. Execute

- Keep marking `[/]` and `[x]` in the tasks Artifact while the mechanical
  tasks.md is updated with `onp-spec tarefa <feature> <T-xxx> <status>`.
- `onp-spec scaffold <feature>` generates the **failing** test skeleton for
  every acceptance criterion without a test — the definition of done is born
  executable.
- Implement until the tests pass. **1 task = 1 atomic commit** (message:
  `T-003 <feature>: <title>`). Mark `[done]` only with proof.
- Finished a lane? Merge `--no-ff` into the working branch, in the plan's
  order; a conflict interrupts and asks the user.

### 6. Verify and Audit (the gate)

- `onp-spec verify <feature>` — runs the tests and records the proof per
  criterion in `.spec/verification/<feature>.json`. Only PASS counts (skip is
  not proof).
- `onp-spec audit --ci` — the verdict. Exit 0 = aligned. **Paste the output in
  the conversation**, translate in one sentence, and then update the
  `walkthrough.md`.
- Failed? Fix and re-audit — in `/goal`, keep going until it exits 0 (iterating
  the implementation); outside it, at most 3 iterations on the same problem
  before escalating to the user.
- Full flow with example: [fluxo.md](references/fluxo.md).

### 7. Learn (closes the cycle)

After the audit exits 0: the path here was recorded by itself in the signal
history (every audit problem and every verify failure/skip).

- `onp-spec licoes sugerir` — the engine points at signals that recurred in
  distinct features and still have no lesson.
- Record **at most 3 lessons** with `onp-spec licoes add --sinal <CODE>
  --feature <f> --fonte <AC-xxx> --texto "general rule in one sentence"`.
  The engine REFUSES a lesson without a real signal (`LICAO_SEM_LASTRO`) —
  don't force it.
- **Clean path → no lessons.** That's correct, not an omission.
- Close the Artifact `walkthrough.md` with: what was delivered, where each file
  is, the audit output and the recorded lessons.
- Phrasing, promotion, penalization and scale: [licoes.md](references/licoes.md).

## Catalog of problems the audit points at

The audit prints each problem with the readable name first and the stable code
in parentheses (the code serves CI and `licoes add --sinal`). When talking to
the user, use the readable name.

| Problem (code) | What it means | What to do |
|---|---|---|
| acceptance criterion without test (AC_SEM_TESTE) | requirement without proof | write the test with `@spec:AC-xxx` in the title |
| acceptance criterion without proof (AC_SEM_PROVA) | test exists, never passed (or was SKIPPED) | run `verify`; skip is not proof |
| orphan test (TESTE_ORFAO) | test points to a criterion that vanished (drift!) | the spec changed — update the test |
| broken reference (REF_QUEBRADA) | task cites a nonexistent story/criterion | fix the reference |
| done task without proof (TASK_CONCLUIDA_SEM_PROVA) | [done] task without proven criterion | verify or reopen the task |
| invalid task status (TASK_STATUS_INVALIDO) | unrecognized status | use pending/in-progress/done |
| open assumption (ASM_ABERTA) | open assumption in a "ready" feature | confirm/invalidate with the user |
| missing required section (SECAO_AUSENTE) | spec without Assumptions/Open Questions section | record them or write "None." |
| violated principle (PRINCIPIO_VIOLADO) | broke the constitution | fix the code, not the principle |
| verification looks at no files (GLOB_SEM_ARQUIVOS) | constitution glob matches nothing | fix the glob |
| invalid principle level (NIVEL_INVALIDO) | unknown level | use [MUST]/[SHOULD]/[MAY] |
| orphan code (ARQUIVO_ORFAO) | code no task maps | map it in the task or question the code |
| divergent feature name (FEATURE_DIVERGENTE) | `> feature:` differs from the directory | align the two |
| weak proof (PROVA_FRACA) | proof only via global exit code | prefer tap/vitest-json/jest-json reporter |
| tracking code too short/duplicate (ID_CURTO / ID_DUPLICADO) | out of grammar / repeated | use 3+ digits, unique codes |

Also: story without criterion (`US_SEM_AC`), incomplete criterion
(`AC_INCOMPLETO`), criterion without task (`AC_SEM_TASK`), open question
(`Q_ABERTA`), principle without verification (`PRINCIPIO_SEM_VERIFICACAO`),
outdated proof (`VERIFY_OBSOLETO`), malformed verification
(`VERIFICACAO_MALFORMADA`, includes a regex that exceeds the timeout), file
does not exist (`ARQUIVO_INEXISTENTE`), invalid status (`STATUS_INVALIDO`),
specification without story (`SPEC_SEM_US`), criterion outside a story
(`AC_FORA_DE_US`).

## Questions the engine answers for you

- **"Which requirement has no test?"** → `onp-spec audit` → acceptance
  criterion without test (`AC_SEM_TESTE`).
- **"Which test doesn't map to a requirement?"** → orphan test (`TESTE_ORFAO`).
- **"Which code serves no requirement?"** → orphan code (`ARQUIVO_ORFAO`).
- **"What are we assuming?"** → `onp-spec assumptions`.
- **"What can run in parallel?"** → `onp-spec plano <feature>` — and WHICH
  tasks to parallelize is the user's choice, via a question.
- **"What's running right now?"** → `onp-spec resumo <feature> --tabela` (the
  progress table) + `onp-spec resumo <feature>` (the text) — and it's you who
  records the summary every ~1 min (`--gravar --origem ai --texto "..."`) and
  posts table and text in the chat.
- **"Where are we?"** → `onp-spec status`.

## Context loading

Load references on demand (in the phase that needs them), never all at once.
Never load specs of two features at the same time.
Constitution: [constituicao.md](references/constituicao.md).

## Golden rule

If you're about to say "done", run `onp-spec audit --ci` and paste the output.
If it didn't exit 0, it's not done. Here, "done" is something the machine
verifies — not a phrase of yours.
