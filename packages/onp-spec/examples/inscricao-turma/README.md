# Example: enrolling in a class

A real, complete project with the audit closing clean. Use it as a reference or as
a demo script.

## Run

```bash
cd examples/inscricao-turma
npx onp-spec verify inscricao-turma   # 3/3 ACs proven
npx onp-spec audit --ci               # exit 0 — spec and code aligned
npx onp-spec status                   # dashboard
```

## What this example shows

- **Full traceability**: US-001/US-002 → AC-001/002/003 → T-001/002/003 →
  tests annotated with `@spec:AC-xxx`.
- **Executable DoD**: each AC has a test; `verify` records the proof in
  `.spec/verification/inscricao-turma.json`.
- **Resolved assumptions**: ASM-001 and ASM-002 are `confirmed` — that's why the
  feature could move to `implemented`. If they were `open`, the audit would block.
- **LGPD constitution**: P-001/002/003 proven by test; P-004 (PII in logs)
  checked by grep. `src/inscricao.js` does not leak personal data.

## The video moment: proving the spec stays true

Rename a requirement in the spec and watch the audit flag the drift right away:

```bash
# change AC-003 to AC-030 in .spec/features/inscricao-turma/spec.md
sed -i '' 's/AC-003/AC-030/g' .spec/features/inscricao-turma/spec.md
npx onp-spec audit --ci
```

Output (exit 1):

```
ERROR AC_SEM_TESTE  AC-030 (...) has no test annotated with @spec:AC-030
ERROR TESTE_ORFAO   test annotated with @spec:AC-003, but that AC doesn't exist (drift!)
```

The spec changed, the test was left behind, and the tool **did not let it pass**. That's
the difference between spec-first (the spec becomes a lie) and spec-anchored (the machine
forces the alignment). Revert with `git checkout` or by undoing the sed.
