# Constitution — v1.1.0

<!--
  Non-negotiable principles of the project. Not style: they are constraints.
  P-xxx = principle (traceability code, like US/AC/T).
  Levels: [MUST] mandatory · [SHOULD] strong · [MAY] permitted/explicit.
  Every [MUST] needs an executable verification — otherwise the audit reports
  "principle without verification" (PRINCIPIO_SEM_VERIFICACAO). Formats:
    - verification(gate): satisfied by the audit itself (only for "meta" principles)
    - verification(test): @principle:P-xxx
    - verification(forbidden): `regex` in `glob`
    - verification(required): `regex` in `glob`
-->

## P-001 [MUST] Every requirement has executable proof

No feature is declared ready without the audit in CI mode exiting clean (exit 0).
This principle is verified by the audit mechanism itself (AC_SEM_TESTE,
AC_SEM_PROVA, TASK_CONCLUIDA_SEM_PROVA) — no extra test needed from you.

- verification(gate): intrinsic to the audit

## P-002 [SHOULD] Secrets never in code

Keys and passwords come from environment variables, never hard-coded.

- verification(forbidden): `(api[_-]?key|senha|password|secret)\s*[:=]\s*['"][^'"]{8,}` in `src/**/*.js`
