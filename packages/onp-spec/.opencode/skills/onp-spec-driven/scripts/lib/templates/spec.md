# Spec: {{TITULO}}

> feature: {{FEATURE}}
> status: draft

<!--
  How to read this file (the format is validated by `onp-spec audit`):
  - US-xxx = user story · AC-xxx = acceptance criterion
    ASM-xxx = assumption · Q-xxx = open question
    These are traceability codes: they link the spec to tasks and tests.
  - Every user story needs at least one acceptance criterion.
  - Every acceptance criterion needs complete Given/When/Then.
  - Codes are unique across the whole project (never reuse a number).
  - Assumptions and Open Questions are REQUIRED: if there are none,
    write "None." — but be suspicious: almost every feature hides one.
-->

## Context

One sentence about the problem this feature solves and for whom.

## Stories

<!-- User story: who needs it, what they need and why. -->

### US-001 — {{TITULO_HISTORIA}}

As a [role], I want [action], so that [value].

<!-- Acceptance criterion: the observable outcome a test can check.
     Write for PEOPLE: title and Then describe what the user sees
     ("the screen warns X"), not the technical detail ("endpoint returns 403") —
     the detail can go in parentheses. -->

#### AC-001 — [acceptance criterion title]

- **Given** [initial state]
- **When** [action]
- **Then** [expected, observable outcome]

## Out of scope

- What this feature explicitly does NOT do.

## Assumptions

<!-- What we are ASSUMING without confirmation. Status: open | confirmed | invalidated -->

| ID | Assumption | Status | Resolution |
|---|---|---|---|
| ASM-001 | [what is being assumed silently?] | open | — |

## Open Questions

<!-- What we don't know yet. Status: open | answered -->

| ID | Question | Status | Answer |
|---|---|---|---|
| Q-001 | [what needs to be decided by the product owner?] | open | — |
