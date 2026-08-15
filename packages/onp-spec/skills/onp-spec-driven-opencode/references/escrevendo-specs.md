# Writing auditable specifications

## An acceptance criterion needs to be observable

The audit engine doesn't understand prose — it understands tests. So every
acceptance criterion needs to describe something a test can check.

| Poor (not testable) | Good (observable) |
|---|---|
| The system must be fast | **Then** the response arrives in under 300ms |
| The password must be secure | **Then** passwords with fewer than 8 characters are rejected |
| The student sees their grades | **Then** the response contains only the authenticated student's grades |

## And it needs to be friendly — the product owner will read it

The acceptance criterion is the contract with whoever doesn't code. Write the
title and the Then as a **result the user can see and verify**, not as an
internal detail:

| Too technical | Friendly (and just as testable) |
|---|---|
| **Then** the endpoint returns 403 | **Then** the screen warns "you don't have access" (and the response is 403) |
| **Then** the job writes to Redis | **Then** the delay warning appears within 1 minute |
| AC-004 — flag `is_late` true | AC-004 — Late submission is flagged to the teacher |

Rule of thumb: read the criterion out loud to someone outside the project — if
the person can't understand what will happen, rewrite it. The technical detail
can go in parentheses; the main sentence is for people.

## Given / When / Then — all three are required

The audit flags "incomplete acceptance criterion" (`AC_INCOMPLETO`) if any
clause is missing. The parser tolerates indentation, the `-` or `*` bullet and
keyword case (and files saved in NFD on macOS) — but the canonical format is
`- **Given** ...`. Use `And` to continue the last one:

```markdown
#### AC-003 — Delay notice

- **Given** a student with an overdue assignment
- **When** they open the assignment
- **Then** they see a delay notice
- **And** the submit button is disabled
```

## Assumptions vs. open questions

- **Assumption (ASM-xxx)**: you filled a gap with a reasonable guess and
  **moved on**. E.g.: "I assume the deadline is always end of day."
  Status: `open` → `confirmed` (the product owner validated) or `invalidated`.
- **Open question (Q-xxx)**: you **stopped** because information is missing.
  E.g.: "which timezone?". Status: `open` → `answered`.

Hard rule: a feature cannot become `implemented`/`audited` with an `open`
assumption. That forces the conversation "look, I assumed X — is that right?"
before considering it done. If the user is in the conversation, ask on the spot
(AskUserQuestion) instead of letting the assumption age.

Even harder rule: the ABSENCE of the `## Assumptions` and `## Open Questions`
sections is also a problem (`SECAO_AUSENTE` — an error on a mature spec). None
at all? Write "None." explicitly — and be suspicious: almost every feature
hides an assumption.

## Tracking codes are global and unique

`US-xxx` (user story), `AC-xxx` (acceptance criterion), `ASM-xxx`
(assumption), `Q-xxx` (question), `T-xxx` (task) and `P-xxx` (principle) are
unique across the whole project. `onp-spec new` continues the numbering
automatically. If you duplicate one, the audit flags a duplicate code
(`ID_DUPLICADO`).

## The specification status lifecycle

```
draft → ready → in-implementation → implemented → audited
```

- `draft`: writing.
- `ready`: spec reviewed, assumptions and questions handled, ready to
  implement.
- `in-implementation`: code in progress. Open questions become warnings.
- `implemented`: code done. Open assumptions become **errors**.
- `audited`: `audit --ci` exited 0 with proof for every acceptance criterion.

## Tasks: field formats

- `Refs:` — codes separated by comma/space. Codes are GLOBAL: a task can
  reference an acceptance criterion from another feature.
- `Files:` — paths separated by COMMA (spaces inside a path are valid):
  `Files: src/meu modulo.js, src/outro.js`. Be thorough here: this is the
  field that decides what the execution plan runs IN PARALLEL (disjoint
  files) and what runs sequentially (shared file).
- `Model:` and `Effort:` (optional) — used by `onp-spec plano` for the task's
  executor: `- Model: claude-opus-5` · `- Effort: high`
  (low|medium|high|xhigh|max). Without them, the config defaults apply
  (`paralelo.model`, `paralelo.esforco`).
- Status: `[pending]` / `[in-progress]` / `[done]` — accents and
  capitalization tolerated (`[Done]` counts); a token outside the list is
  "invalid task status" (`TASK_STATUS_INVALIDO`, error), never silently
  ignored. To update without editing by hand: `onp-spec tarefa <feature> <T-xxx> <status>`.
