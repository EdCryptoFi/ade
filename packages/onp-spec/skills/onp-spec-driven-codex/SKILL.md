---
name: onp-spec-driven
description: Desenvolvimento spec-anchored nativo para Codex — a especificação continua verdadeira porque é auditada mecanicamente contra o código. Use ao planejar features, implementar com verificação, ou auditar uma implementação contra a spec. Gatilhos "especificar feature", "nova feature", "implementar", "auditar spec", "verificar", "plano de execução", "executar em paralelo", "o que não tem teste", "lições aprendidas". Fluxo Especificar → Projetar → Tarefas → Plano → Executar → Auditar → Aprender, com rastreabilidade história→critério de aceite→tarefa→teste, definição de pronto executável (cada critério de aceite vira teste anotado), suposições e perguntas como cidadãs de primeira classe, constituição verificável (preset LGPD/educação), lições aprendidas com lastro mecânico e plano de execução com PARALELISMO OPCIONAL: o agente apresenta o plano recomendado e SEMPRE pergunta QUAIS tarefas o usuário quer paralelizar (faixas com git worktrees + sessões headless `codex exec` via --paralelizar, ou uma tarefa após a outra via --sequencial) e SEMPRE confirma os MODELOS e ESFORÇOS por tarefa antes de executar — os tokens e a licença são do usuário; ele trava o custo com --modelo/--esforco no plano ou por tarefa via `onp-spec tarefa`. Avisa que a execução roda em background e, durante ela, posta no chat a cada 1 minuto a tabela de andamento (o que está rodando e o que não está) + resumo geral — com resumo completo ao final. Integração com os recursos nativos do Codex (plano visível, /plan, /goal, /review, invocação explícita com $onp-spec-driven). Motor mecânico EMBARCADO na skill (zero instalação — roda com o node do ambiente).
license: MIT
metadata:
  author: Vitor Manoel — O Novo Programador
  version: 3.6.0
  agent: codex
---

# onp-spec-driven — the specification that stays true (Codex)

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

## Interaction — use the Codex harness for the user

This skill runs natively inside Codex (the user can invoke it explicitly with
`$onp-spec-driven`, or you adopt it when the request matches the description).
Use the native resources to keep the flow visible and interactive, without
turning into bureaucracy:

- **Explain what you did and where you are**: after EVERY action, say in simple
  English (1) what was done, (2) the path of each file created or changed,
  (3) what the next step is. The user should never need to ask "where's the
  file?" nor "what now?".
- **Visible plan (Codex's plan tool)**: when starting a feature, create one
  plan item per phase ("Specify homework-submission", "Write tests",
  "Implement", "Audit"...). On large features, one item per task (T-xxx) in
  the Execute phase. Keep the status updated at every step — that's how the
  user tracks where you are without asking.
- **Direct questions in chat**: when an open question or an assumption needs
  confirmation and the user is present, ask right away, with concrete numbered
  options (include your recommendation) — and record the answer in the spec
  (status `answered`/`confirmed`). Don't accumulate questions silently or
  decide alone what belongs to the product owner.
- **Codex modes — recommend them at the right moment**:
  - `/plan`: to design the implementation BEFORE touching the code — useful in
    the Design and Plan phases.
  - `/goal`: to close an entire feature — the goal is `onp-spec audit --ci`
    exiting 0; persisting is implementing for real, and the contract rules
    (below) still apply inside `/goal`.
  - `/review`: review of the changes before the merge — complements (never
    replaces) the mechanical gate.
- **Translate the engine's output**: after each command, summarize in 1–3
  sentences of simple English what the machine said and the next step. Also
  paste the raw output (it's the proof), but never deliver it alone.
- **Respect the advanced user**: if the user shows they know the flow (uses
  the codes, asks for direct commands), cut the didactic explanations and go
  straight to the point. The translation shortens; the rigor (verify + audit)
  never does.

## The embedded engine (zero install)

The mechanical engine lives INSIDE this skill, at `scripts/onp-spec.mjs` —
resolved **relative to this SKILL.md's directory** (Codex reports the skill's
directory when loading it; never assume a fixed install path). Nothing to
install: no npm, no npx, no global CLI.

All commands run **from the user's project root**:

```bash
node <this-skill-dir>/scripts/onp-spec.mjs <command>
```

Commands: `init [--preset base|lgpd-educacao]` · `new <feature>` ·
`plano <feature> [--agents codex] [--paralelizar T-xxx,T-yyy] [--sequencial]` ·
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
   Running the audit and **pasting the output** is the last step, always.
4. **Assumptions and open questions are required.** Filled a gap without
   confirming? It's an assumption. Missing information? It's an open question.
   A missing section is also a problem (`SECAO_AUSENTE`) — if there are none,
   write "None." and be suspicious.
5. **The constitution rules.** [MUST] principles are verified; violating them
   breaks the audit. Never fix the principle to "make it pass" — fix the code.
6. **Never weaken, skip or delete a test to pass.** This applies ALSO inside
   `/goal`: "don't give up until exit 0" means iterating the IMPLEMENTATION,
   never loosening the gate. If the audit fails 3 times in a row on the same
   problem, STOP and present the findings to the user — don't iterate forever
   or bypass the gate.

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

## Step by step on Codex

### 1. Specify

- **Before writing, load the learned guide**: `onp-spec licoes list` (on a big
  project, filter: `--escopo <domain>`). They are rules confirmed by real
  failures of previous features — apply them to the spec.
- `onp-spec new <feature>` creates `.spec/features/<feature>/spec.md` and
  `tasks.md` with continuous tracking codes (unique across the whole project).
- Write the **user stories (US-xxx)** and, for each one, the **acceptance
  criteria (AC-xxx)** in Given/When/Then. The criterion must be observable —
  something a test checks. "Must be fast" isn't a criterion; "responds in
  < 300ms" is.
- **Record assumptions (ASM-xxx) and open questions (Q-xxx)** with an honest
  status (`open`). User present? Ask right away, in chat, with concrete
  options — and record the answer.
- Run `onp-spec audit` and read the problems it points to (incomplete
  criterion, story without criterion, missing section...) — they tell you
  what's missing.
- Writing details: [escrevendo-specs.md](references/escrevendo-specs.md).

### 2. Design (large features)

Create `design.md` with architecture and components (Codex's `/plan` helps
design before coding). Every non-obvious decision becomes either an assumption
(you assumed) or an open question (needs the product owner).

### 3. Tasks

- In `tasks.md`, break into **tasks (T-xxx)**. Each task has `Refs:` (the
  stories/criteria it serves — codes are global, you can reference a criterion
  from another feature) and `Files:` (separated by COMMA; spaces in paths are
  allowed). Optional per-task fields: `Model:` (a Codex model, e.g.:
  `gpt-5.6-terra`) and `Effort:` (low|medium|high|xhigh — the plan converts it
  to `model_reasoning_effort`). Model and effort are **your proposals** —
  whoever has the final say is the user, in the cost confirmation of the Plan
  phase; to adjust without editing the file:
  `onp-spec tarefa <feature> <T-xxx> --modelo <m> --esforco <level>`.
- Status in brackets: `[pending]`, `[in-progress]`, `[done]` (accents and
  capitalization tolerated; unknown token is an error).
- **Closed tasks.md? Announce the parallelism and ASK WHICH.** Run
  `onp-spec plano <feature>` and present the plan to the user, unprompted, as a
  RECOMMENDATION: *"X of these Y tasks can run IN PARALLEL, in N lanes — I
  recommend it this way."* Then ask in chat: **which tasks does the user want
  to parallelize?** List the parallelizable tasks as options — the
  recommendation (all) marked "(recommended)"; more than 4? group by lane.
  Include the option "none — one after another". The choice is theirs — never
  execute without that answer, and never keep the parallelism a secret of the
  engine.

### 4. Execution plan (2+ pending tasks)

- **WHICH tasks to parallelize is the USER's choice — ask before executing**
  (the question from the Tasks phase; if you haven't asked yet, ask now). Chose
  all → use the plan as is. Chose a subset → regenerate with
  `onp-spec plano <feature> --paralelizar T-xxx,T-yyy` and execute that one.
  Chose none → regenerate with `--sequencial`. Without an answer, don't
  execute.
- **MODEL and EFFORT are the USER's choice — confirm BEFORE executing.**
  The tokens and the license are theirs (whoever has a cheap plan burns the
  quota with a strong model + high effort). `onp-spec plano` already prints
  the list "models and efforts of this plan" (one line per task: model ·
  effort) — present it and ask, with concrete options: **(a)** keep as is (the
  recommendation); **(b)** save on everything — regenerate with
  `onp-spec plano <feature> --modelo gpt-5.6-luna --esforco baixo` (the two
  lock ALL tasks and win over tasks.md and config); **(c)** adjust per task —
  `onp-spec tarefa <feature> <T-xxx> --modelo <m> --esforco <level>` and
  regenerate the plan; **(d)** the model THEY propose — use what the user
  asks, without arguing. Without this confirmation, do not execute. Never
  raise model/effort without the user asking.
- `onp-spec plano <feature>` (if detection gets it wrong, force with
  `--agents codex`) groups tasks on **disjoint files** into **parallel lanes**
  — 1 lane = 1 git worktree + 1 branch + 1 clean context window; with
  `--paralelizar T-xxx,T-yyy`, only the CHOSEN ones join the lanes (the rest
  run one after another, at the end, on the main tree); with `--sequencial`,
  ALL tasks run one after another, in tasks.md order. Three artifacts in
  `.spec/features/<feature>/`:
  - `plano-execucao.md` — lanes/order, branch/commit management and gate;
  - `executar-tarefas.sh` — headless executor: runs `codex exec` with `--model`
    and `model_reasoning_effort` already set per task, `--json` output (the
    stream goes to the ledger), `workspace-write` sandbox and `--add-dir` for
    the shared `.git` of the worktrees (per lane in parallel, or one task at a
    time in sequential mode), merges whatever needs merging, marks the tasks
    and closes with verify + audit;
  - `plano-execucao.html` — visual of the plan (read-only, no button).
- **Present the plan to the user**: summarize the lanes (or the order, in
  sequential), say where the files are and offer the routes — automatic (YOU
  run `bash .spec/features/<feature>/executar-tarefas.sh` in a background
  terminal) or manual (you implement it yourself, following the plan's branches
  and commits).
- **Before executing, WARN — always**: with parallelism and costs already
  confirmed, tell the user, in one sentence, that the changes will run in
  **background**, that every 1 minute you'll post the **progress table** here,
  and that at the end they'll get the **full summary** of the execution. Only
  then run the script.
- **Table + summary every 1 minute (required while it runs)**: with the script
  in background, every ~1 min post the **progress table** in the chat
  (`onp-spec resumo <feature> --tabela` — one line per task: which is running,
  which isn't, what finished/failed and the last action) and the **summary**
  (`onp-spec resumo <feature>` — the executor records an AI-written summary
  every minute in the ledger; fallback: engine). The same text comes out on the
  script's terminal (`📣 resumo`). Also mirror the tasks in Codex's visible
  plan. The user is never left without knowing what's going on.
- **Done? Deliver the full summary**: the final table, what each task did
  (commits), what failed (if anything did) and the gate output (verify + audit)
  pasted and translated into one sentence.
- **A lane failed? don't rerun everything.** Read the log and the stream,
  understand the cause, and run `executar-tarefas.sh --faixa <id>` (the
  previous attempt's worktree and branch are cleaned first); `--seq <T-xxx>`
  redoes one task, `--gate` runs only the verdict, and `--listar` shows the
  targets. The work that already passed stays intact.
- Changed tasks.md or the config (`paralelo` in onpspec.config.json — including
  `sandbox`, if the user decides to release more than `workspace-write`)?
  **Regenerate the plan** — never edit the artifacts by hand.

### 5. Execute

- Mirror the tasks in Codex's visible plan and keep updating the status — the
  user follows the progress in real time. In the mechanical tasks.md, use
  `onp-spec tarefa <feature> <T-xxx> <status>`.
- `onp-spec scaffold <feature>` generates the **failing** test skeleton for
  every acceptance criterion without a test — and also for every constitution
  principle with `verification(test)` still without a tag. The definition of
  done is born executable.
- Implement until the tests pass. **1 task = 1 atomic commit** (the message
  cites the task: `T-003 <feature>: ...`). Mark `[done]` only with PASS proof.
- At least one test per acceptance criterion; the test asserts the spec's
  result, not the shape of your code.

### 6. Verify and Audit (the gate)

- `onp-spec verify <feature>` — runs the tests, records the proof per
  acceptance criterion in `.spec/verification/<feature>.json`. Only PASS counts
  (skip is not proof).
- `onp-spec audit --ci` — the verdict. Exit 0 = aligned. Exit 1 = read each
  problem and fix it. **Paste the final output in the conversation** and
  translate in one sentence what it means.
- Failed? Fix and re-audit — in `/goal`, keep going until it exits 0 (iterating
  the implementation); outside it, at most **3 iterations** on the same problem
  before stopping and escalating to the user with the ranked problems.
- Full flow with example: [fluxo.md](references/fluxo.md).

### 7. Learn (closes the cycle)

After the audit exits 0: the path here was recorded by itself in the signal
history (every audit problem and every verify failure/skip).

- `onp-spec licoes sugerir` — the engine points at signals that recurred in
  distinct features and still have no lesson.
- Record **at most 3 lessons** with `onp-spec licoes add --sinal <CODE>
  --feature <f> --fonte <AC-xxx> --texto "general rule in one sentence"
  [--escopo <domain>]`. The engine REFUSES a lesson without a real recorded
  signal (`LICAO_SEM_LASTRO`) — if it refuses, the lesson doesn't exist; don't
  force it.
- **Clean path → no lessons.** That's correct, not an omission.
- A durable project rule that doesn't depend on a signal (folder convention,
  build command)? Its place is the repo's `AGENTS.md` — suggest it to the
  user; an engine lesson is only what has mechanical backing.
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
  tasks to parallelize is the user's choice, via a question in chat.
- **"Can it run cheaper?"** → `onp-spec plano <feature> --modelo
  gpt-5.6-luna --esforco baixo` (everything) or `onp-spec tarefa <feature>
  <T-xxx> --modelo <m> --esforco <level>` (per task, and regenerate the plan)
  — models and efforts ALWAYS pass through the user's confirmation before
  executing.
- **"What's running right now?"** → `onp-spec resumo <feature> --tabela` (the
  progress table) + `onp-spec resumo <feature>` (the text); post both in the
  chat every ~1 min while there's an execution.
- **"Only one lane failed, how do I redo just it?"** →
  `bash <baseDir>/executar-tarefas.sh --faixa <id>`.
- **"Where are we?"** → `onp-spec status`.

## Context loading

Load references on demand (in the phase that needs them), never all at once.
Never load specs of two features at the same time.
Constitution: [constituicao.md](references/constituicao.md).

## Golden rule

If you're about to say "done", run `onp-spec audit --ci` and paste the output.
If it didn't exit 0, it's not done. Here, "done" is something the machine
verifies — not a phrase of yours.
