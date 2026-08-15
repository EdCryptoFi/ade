# Constitution — principles the machine verifies

The constitution (`.spec/constituicao.md`) encodes the project's **non-negotiable**
constraints. It's not style; it's law. And, unlike other tools, every
[MUST] principle here has an **executable verification** — otherwise the audit
flags "principle without verification" (`PRINCIPIO_SEM_VERIFICACAO`).

## Levels of obligation

- `[MUST]` — required. Needs verification. Violation = error in the audit.
- `[SHOULD]` — strong. Verification optional. Violation = warning.
- `[MAY]` — allowed/explicit. Documents a conscious choice.

## Four forms of verification

```markdown
## P-001 [MUST] Every requirement has executable proof
- verification(gate): intrinsic to the audit
```
→ satisfied by the audit mechanism itself (criterion without test, criterion
without proof, done task without proof). Only for "meta" principles about the
process — domain rules use the forms below.

```markdown
## P-001 [MUST] A student's grade is never exposed to another student
- verification(test): @principle:P-001
```
→ requires at least one test with `@principle:P-001` in the title and that it
passes in verify. You write the test that proves the principle.

```markdown
## P-004 [MUST] Personal data never in logs
- verification(forbidden): `console\.log\(.*cpf` in `src/**/*.js`
```
→ the audit greps the pattern in the glob's files. Any occurrence = violation,
with exact file and line (traceability principle → file → line).

```markdown
## P-010 [MUST] Every grade route goes through checarDono()
- verification(required): `checarDono\(` in `src/rotas/notas/**/*.js`
```
→ if files exist in the glob but none contains the pattern, it's a violation.

## LGPD + education preset

`onp-spec init --preset lgpd-educacao` already comes with real principles for
products that hold student data (including minors):

- **P-001** grade never exposed to another student (test)
- **P-002** grade access is logged — audit trail (test)
- **P-003** minors' data only with an explicit legal basis (test)
- **P-004** personal data never in logs (forbidden, grep)
- **P-005** collection minimization (should)
- **P-006** pedagogical error is not punitive data (should)
- **P-007** deletion on the data subject's request (may)
- **P-008** student data portability (may)

Adjust the globs/regexes to your stack — they really run in the audit, so they
need to point at your files. Engine guard-rails:

- glob matching NO file → "verification looks at no files"
  (`GLOB_SEM_ARQUIVOS` — inert verification, likely a typo);
- level outside [MUST]/[SHOULD]/[MAY] → "invalid principle level"
  (`NIVEL_INVALIDO` — the principle is treated as MUST, never ignored);
- regexes run in a subprocess with a timeout (5s) — a pathological pattern
  (catastrophic backtracking) becomes "malformed verification"
  (`VERIFICACAO_MALFORMADA`), it doesn't hang the gate;
- the skeleton of principle tests (`verification(test)`) is born in
  `scaffold`, together with the acceptance criterion tests.

## Traceability that makes a security difference

A banking-microservices case study reported 73% fewer security defects when
principles were traced to file and line. That is exactly what
`verification(forbidden)` and `verification(required)` do: each violation comes
out with `file:line`, not "review the code".
