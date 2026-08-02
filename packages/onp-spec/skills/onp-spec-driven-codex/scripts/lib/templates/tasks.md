# Tasks: {{TITULO}}

> feature: {{FEATURE}}

<!--
  How to read this file (the format is validated by `onp-spec audit`):
  - T-xxx = task (traceability code, unique across the whole project).
  - Every task references in `Refs:` at least one user story (US-xxx)
    or acceptance criterion (AC-xxx).
  - Every task lists the files it creates/modifies in `Files:` — be thorough:
    this is what decides what `onp-spec plano` runs IN PARALLEL (disjoint
    files) and what runs sequentially.
  - Optional per-task fields, used by the execution plan:
    `- Model: claude-sonnet-5` and `- Effort: high` (low|medium|high|xhigh|max).
  - A task can only become [done] when its acceptance criteria have PASS
    proof recorded by `onp-spec verify`.
  Status: pending | in-progress | done
    (shortcut: `onp-spec tarefa <feature> <T-xxx> <status>`)
-->

## T-001 — [task title] [pending]

- Refs: US-001, AC-001
- Files: src/exemplo.js
- Notes: [decisions, dependencies on other tasks]
