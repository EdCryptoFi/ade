# Constitution — v1.0.0 (preset: LGPD + Education)

<!--
  Principles for educational products that store students' personal data —
  including minors (LGPD art. 14: best interest of the child; consent of at
  least one parent/guardian).

  Levels: [MUST] mandatory · [SHOULD] strong · [MAY] permitted/explicit.
  Every [MUST] needs executable verification. Accepted formats:
    - verification(test): @principle:P-xxx
    - verification(forbidden): `regex` in `glob`
    - verification(required): `regex` in `glob`

  Adjust the globs/regex to your stack — these are REAL starting points,
  not decoration: the audit runs each one of them.
-->

## P-001 [MUST] A student's grade is never exposed to another student

Every endpoint/query that returns a grade, correction or feedback filters by
the authenticated student. Aggregated listings (class average) do not identify
individuals.

- verification(test): @principle:P-001

## P-002 [MUST] Grade access is logged (audit trail)

Every read of a grade/correction records who accessed it, what and when.
LGPD art. 37: record of processing operations.

- verification(test): @principle:P-002

## P-003 [MUST] Minors' data only with explicit legal basis

Registering a minor student requires recorded guardian consent (who, when, how).
No minor's data is used for marketing.

- verification(test): @principle:P-003

## P-004 [MUST] Personal data never appears in logs

CPF, email, phone and grades never go to console/log in plain text.

- verification(forbidden): `console\.(log|error|warn)\(.*(cpf|nota|email|telefone)` in `src/**/*.js`

## P-005 [SHOULD] Minimization: only collect what the pedagogy requires

Each collected personal field has a written pedagogical justification in the
spec of the feature that collects it (LGPD art. 6, III — necessity).

## P-006 [SHOULD] Pedagogical error is not punitive data

The student's error/attempt history exists to teach, not to rank publicly.
Public rankings only with opt-in.

## P-007 [MAY] Deletion on data subject's request

The data subject (or guardian) may request data deletion; the system MAY
keep the legal minimum (fiscal records) with a documented retention period.

## P-008 [MAY] Student data portability

The student MAY export their history (tasks, grades, feedback) in a
machine-readable format.
