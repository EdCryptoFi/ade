# onp-spec-driven

**The specification that stays true.** You describe the feature, the AI agent
specifies it, plans it, runs it in parallel and **proves** it did — with
mechanical auditing, not with promises. If the spec and the code drift apart,
the machine calls it out.

```
┌────────┐  ┌──────┐  ┌─────┐  ┌────┐  ┌───────┐  ┌─────┐
│ESPECIFY│→ │DESIGN│→ │TASKS│→ │PLAN│→ │EXECUTE│→ │AUDIT│
└────────┘  └──────┘  └─────┘  └────┘  └───────┘  └─────┘
                                     ↑ parallel     ↑ the mechanical gate
```

## Installation (2 minutes)

The skill is **self-contained**: the mechanical engine ships embedded inside it
(zero dependencies — it just needs Node.js ≥ 18 in the environment, which your
agent already uses). Installing means putting a folder in the right place — and
the command below does that for you. Choose your agent:

### Claude Code

At the **root of your project**, run:

```bash
npx @onovoprogramador/onp-spec init --agents claude
```

The command does two things:

1. creates the project's `.spec/` structure (a constitution of principles +
   a configuration file — both editable, with ready-made defaults);
2. installs the skill in `.claude/skills/onp-spec-driven/` — the skills
   directory that Claude Code reads in this project.

**To activate:** open a new conversation in Claude Code. The skill engages on
its own when the request matches it ("specify feature X", "audit against the
spec"...).

### Codex

At the **root of your project**, run:

```bash
npx @onovoprogramador/onp-spec init --agents codex
```

The command does two things:

1. creates the project's `.spec/` structure;
2. installs the skill in `.agents/skills/onp-spec-driven/` — the skills
   directory that Codex reads in the repository.

**To activate:** open a new conversation. The skill engages on its own when the
request matches it, or invoke it explicitly with `$onp-spec-driven`.

> **Your tokens, your choice:** before executing any plan, the agent shows the
> **model and effort of each task** and asks whether they fit within your
> license. You answer in the conversation: keep them, economize on everything,
> adjust one specific task, or propose whatever model you want — the agent
> adjusts the plan for you. Without your confirmation, nothing runs.

### Cursor

At the **root of your project**, run:

```bash
npx @onovoprogramador/onp-spec init --agents cursor
```

The command does two things:

1. creates the project's `.spec/` structure;
2. installs the skill in `.cursor/skills/onp-spec-driven/` — Cursor supports
   Agent Skills natively since 2.4, in the editor and in the CLI.

**To activate:** open a new conversation. The skill engages on its own when the
request matches it, or invoke it explicitly by typing `/onp-spec-driven` in the
Agent chat.

**For automatic parallel execution**, the executor uses the Cursor CLI in
headless mode. If you don't have it yet, install and log in:

```bash
curl https://cursor.com/install -fsS | bash
agent login
```

Without the CLI, the plan still works through the manual route: the prompts for
each lane come ready for you to paste into the parallel agents of the Agents
Window.

> **Your tokens, your choice:** in Cursor, `claude-*`/`gpt-*` models are billed
> per usage and `composer` (the house model) is included in paid plans. Before
> executing any plan, the agent shows the **model of each task** and asks
> whether it fits within your plan — you answer in the conversation (keep,
> switch everything to `composer`, adjust one task, or propose another model)
> and the agent adjusts it for you. Without your confirmation, nothing runs.

### Antigravity

At the **root of your project**, run:

```bash
npx @onovoprogramador/onp-spec init --agents antigravity
```

The command does two things:

1. creates the project's `.spec/` structure;
2. installs the skill in `.agents/skills/onp-spec-driven/` — the skills
   directory of the Antigravity workspace.

**To activate:** open a new conversation and you're done — parallel execution
uses Antigravity's native agents, without depending on any CLI.

### opencode

At the **root of your project**, run:

```bash
npx @onovoprogramador/onp-spec init --agents opencode
```

The command does two things:

1. creates the project's `.spec/` structure;
2. installs the skill in `.opencode/skills/onp-spec-driven/` — the skills
   directory opencode reads in this project.

**To activate:** open a new conversation in opencode. The skill engages on its
own when the request matches it ("specify feature X", "audit against the
spec"...), or invoke it explicitly with the skill name.

Parallel execution runs `opencode run` headless per lane. Models use opencode's
`provider/model` format — a bare `claude-*` config default becomes
`anthropic/<slug>` automatically. Reasoning effort goes to opencode's
`--variant` flag.

> **Your tokens, your choice:** before executing any plan, the agent shows the
> **model and effort of each task** and asks whether they fit within your
> license. You answer in the conversation (keep them, economize on everything,
> adjust one task, or propose another model) and the agent adjusts it for you.
> Without your confirmation, nothing runs.

### Without npm/npx (manual installation, per project)

Download the repository once and copy your agent's skill folder into the
project. The destination folder is **always** called `onp-spec-driven`:

```bash
git clone --depth 1 https://github.com/onovoprogramador/onp-spec-driven.git /tmp/onp-spec

# Claude Code (in this project)
mkdir -p .claude/skills
cp -r /tmp/onp-spec/skills/onp-spec-driven .claude/skills/onp-spec-driven

# Codex (in this project)
mkdir -p .agents/skills
cp -r /tmp/onp-spec/skills/onp-spec-driven-codex .agents/skills/onp-spec-driven

# Cursor (in this project)
mkdir -p .cursor/skills
cp -r /tmp/onp-spec/skills/onp-spec-driven-cursor .cursor/skills/onp-spec-driven

# Antigravity (in this workspace)
mkdir -p .agents/skills
cp -r /tmp/onp-spec/skills/onp-spec-driven-antigravity .agents/skills/onp-spec-driven

# opencode (in this project)
mkdir -p .opencode/skills
cp -r /tmp/onp-spec/skills/onp-spec-driven-opencode .opencode/skills/onp-spec-driven
```

### Global installation — the skill in all your projects

Prefer to install **once**, for all projects? Copy the skill to your agent's
global directory (instead of the project's). The rule is the same: **the
destination folder is called `onp-spec-driven`** — Cursor, for example,
requires the folder name to equal the skill's internal name, and copying it as
`onp-spec-driven-cursor` would leave it invalid.

```bash
git clone --depth 1 https://github.com/onovoprogramador/onp-spec-driven.git /tmp/onp-spec

# Claude Code (global)
mkdir -p ~/.claude/skills
cp -r /tmp/onp-spec/skills/onp-spec-driven ~/.claude/skills/onp-spec-driven

# Codex (global)
mkdir -p ~/.agents/skills
cp -r /tmp/onp-spec/skills/onp-spec-driven-codex ~/.agents/skills/onp-spec-driven

# Cursor (global)
mkdir -p ~/.cursor/skills
cp -r /tmp/onp-spec/skills/onp-spec-driven-cursor ~/.cursor/skills/onp-spec-driven

# Antigravity (global)
mkdir -p ~/.gemini/config/skills
cp -r /tmp/onp-spec/skills/onp-spec-driven-antigravity ~/.gemini/config/skills/onp-spec-driven

# opencode (global)
mkdir -p ~/.config/opencode/skills
cp -r /tmp/onp-spec/skills/onp-spec-driven-opencode ~/.config/opencode/skills/onp-spec-driven
```

With the global skill, the `.spec/` structure stays per project — but you don't
need to run anything: on the first conversation, ask *"initialize onp-spec
here"* and the agent creates everything (the skill's embedded engine takes care
of it).

> **Important:** each agent has ITS OWN skill — the Claude Code one executes
> the plan with parallel headless sessions of Claude itself; the Codex one,
> with `codex exec` headless sessions; the Cursor one, with headless sessions
> of the Cursor CLI (`agent -p`); the opencode one, with headless `opencode
> run` sessions; the Antigravity one uses its native parallel
> agents. **Codex and Antigravity read the same directory** (`.agents/skills/`),
> so install there the skill of the agent you use in this project — `init`
> refuses to overwrite one agent's skill with another's. **Watch out with
> Cursor:** besides its own directory (`.cursor/skills/`), Cursor also reads
> `.agents/skills/` natively and `.claude/skills/`/`.codex/skills/` for
> compatibility — in a project that already has ANOTHER agent's skill
> installed, Cursor would see two skills with the same name and could load the
> wrong one. Use ONE agent's skill per project (`init --agents cursor` warns
> you if it finds another variant installed).

## How to use — you talk, the agent proves

You **don't need to learn any command**. The `onp-spec …` commands that appear
throughout the repository are internal to the skill: the agent runs them for
you and pastes the proof into the conversation. Your job is to chat:

> *"Specify the student enrollment feature."*
>
> *"Good. Split it into tasks and generate the execution plan."*
>
> *"You can run it in parallel. Update me every minute."*
>
> *"Lane 2 failed — re-run just that one."*
>
> *"Audit what was done against the spec and show me the proof."*

What you get back, always in plain language:

- **Readable specification** in `.spec/features/<feature>/` — user stories and
  acceptance criteria written for people (the technical detail goes in
  parentheses), plus the **Assumptions** and **Open Questions** the agent is
  required to confess.
- **Execution plan with optional parallelism** — tasks that don't touch each
  other MAY run **in parallel**, each in its own clean window (git worktree +
  its own branch). But you decide: the agent presents the plan as a
  **recommendation** (*"X of these tasks can run in parallel"*) and **asks
  WHICH ones you want to parallelize** — all of them, only a few (the chosen
  ones in parallel, the rest one after another at the end), or none (everything
  in order, on the main tree) — always with the same commit discipline and the
  same gate.
- **You always know what's going on** — before executing, the agent warns that
  the changes will run **in the background**; while they run, every 1 minute it
  posts to the chat the **progress table** (which task is running, which isn't,
  what concluded/failed) and the **general progress summary**: a paragraph in
  plain language (written by AI, with an engine fallback). At the end, you get
  the full execution summary.
- **A lane failed? redo just that one** — ask *"re-run only lane 2"* and the
  agent repeats only that lane, from scratch and in a clean window, without
  touching what already passed.
- **Commit and branch management handled** — 1 task = 1 traceable commit,
  organized merges, clean tree at the end.
- **The proof** — at the end, the mechanical audit: every acceptance criterion
  has a test that passed, or the feature **is not ready**. The verdict is an
  exit code, not a sentence from the agent.

## Why "spec-anchored" (and not spec-first)

Spec Kit, Kiro, OpenSpec — all of them are **spec-first**: the spec generates
the code, the code evolves, and the spec becomes well-formatted fiction. Here
it's **spec-anchored**: spec and code evolve together because a mechanical gate
forces the alignment, all the time. The difference shows up on the day someone
asks "does this still work as written?" — and the answer is a command, not a
meeting.

## What the skill guarantees

1. **End-to-end traceability** — every story, acceptance criterion and task
   has a code; every criterion points to the test that proves it. "Which
   requirement has no test?" is a question the machine answers.
2. **"Done" is the machine's verdict** — the agent can't declare victory: the
   test runner decides, and **a skipped test does not count as proof**.
3. **Assumptions and questions are mandatory** — what the agent assumed without
   confirming is recorded with a status; a feature doesn't close with an open
   assumption. You point at the screen: *"he assumed you can't resend — is that
   right?"*
4. **Project constitution** — non-negotiable rules (ready-made LGPD/education
   preset: "a student's grade is never exposed to another student", "personal
   data never in logs") with executable verification, traced down to file and
   line.
5. **Lessons with backing** — the project learns feature after feature, but
   only a lesson anchored in a real recorded failure gets in; loose opinion is
   rejected.
6. **Planned parallel execution** — tasks on disjoint files run at the same
   time, in clean context windows, with branches and commits organized by the
   plan — and the final gate closes everything.

## Does it really work?

Benchmark with real specs from the domain and defects that actually sicken SDD
projects, measuring **mechanical detection** (what CI catches on its own):

| Tool | Defect detection | |
|---|---|---|
| **onp-spec-driven** | **100%** (9/9) | ✅ clean baseline |
| OpenSpec | 11% (1/9) | incomplete requirement only |
| spec-kit | 0% mechanical | scaffolding; optional tests |

Details and full matrix: [benchmark/RESULTS.md](benchmark/RESULTS.md).
Complete, runnable example: [examples/inscricao-turma](examples/inscricao-turma).

## For the curious

The engine the skill embeds also exists as a standalone CLI
(`npm i -g @onovoprogramador/onp-spec`) and runs in CI — the same audit that
blocks the agent blocks the pipeline. Architecture, full finding catalog and
file formats: [ARQUITETURA.md](ARQUITETURA.md). The guide the agent follows is
in the skill itself: [skills/onp-spec-driven/SKILL.md](skills/onp-spec-driven/SKILL.md).

## Requirements

Node.js ≥ 18. No other dependencies — not for you, not for the agent.

## License

MIT © Vitor Manoel — O Novo Programador
