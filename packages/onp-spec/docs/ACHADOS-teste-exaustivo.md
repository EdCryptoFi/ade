# Findings — exhaustive test of the onp-spec-driven skill (17/07/2026)

Base: repo `onp/onp-spec-driven` (CLI `bin/onp-spec.js` + skill `skills/onp-spec-driven/`).
Method: ~80 scenarios in isolated sandboxes (runner.mjs 63, runner2.mjs 14, manual probes).
Own suite: 41/41 PASS. Benchmark: 100% (9/9), clean baseline. Package published to npm.

## CRITICAL — gate bypass or false verdict

| # | Finding | Evidence |
|---|---|---|
| CR-1 | **`skip`/`todo` tests count as PASS proof.** TAP emits `ok ... # SKIP`; `parseTap` does not read directives → agent skips the test and `audit --ci` exits 0. Undermines the thesis "the agent cannot declare victory". | skip probe: `verify f: 1/1 PASS` with `{skip:true}` test |
| CR-2 | **`[concluída]` (correct PT spelling!) silently becomes `pendente`.** RE_TASK only accepts `concluida` without accent; with the accent it falls back to "no status" → `TASK_CONCLUIDA_SEM_PROVA` never fires. | C3 |
| CR-3 | **Large `audit --json` output is truncated** (~8KB): `process.exit()` in the bin before stdout flush → invalid JSON in CI/pipe. | G1: `len=8126`, unterminated JSON |
| CR-4 | **ReDoS in the constitution freezes the audit**: `verificação(proibido)` with pathological regex `(a+)+$` → 60s+ no response (gate becomes a DoS). | H3: 60003ms (killed by timeout) |
| CR-5 | **Base preset makes the gate unclosable on the happy path**: P-001 [MUST] requires a `@principle:P-001` test that no flow step creates → every `audit` exits 1; users learn to ignore the gate. | E1b, I6 |

## HIGH — false positives/negatives

| # | Finding | Evidence |
|---|---|---|
| AL-1 | **NFD (macOS) breaks the parser**: decomposed "Então" does not match `RE_GWT` → false `AC_INCOMPLETO` on a correct spec. | B6 |
| AL-2 | **Path with space in `Arquivos:`** is split by `[,\s]+` → false `ARQUIVO_INEXISTENTE` and wrong mapping. | C4 |
| AL-3 | **Indented GWT (2 spaces)** → false `AC_INCOMPLETO` (nested lists are common markdown). | B18 |
| AL-4 | **`verificação(obrigatório)` with a glob matching 0 files passes silently** — a glob typo disables the principle without warning. | D4 |
| AL-5 | **Unknown level `[OBRIGATORIO]`** → principle silently ignored (not parsed, not reported). | D7 |
| AL-6 | **Missing Assumptions/Questions sections → no finding.** Differentiator #3 ("mandatory") is not enforced mechanically; an error only occurs if the section exists with an open ASM. | I10 |
| AL-7 | **`@spec:` tag in a comment/dead code silences `AC_SEM_TESTE`** (the scanner matches any line); with the `exitcode` reporter the bypass is complete (all ACs become pass). | analysis + E5 |

## MEDIUM — semantics and UX

- MD-1 Refs between features → `REF_QUEBRADA` even with a globally existing AC (IDs are global, refs are local — inconsistent). [I5]
- MD-2 `> feature:` never compared to the directory name — silent drift.
- MD-3 Silent strictness without suggestion: lowercase `**dado**`, `US-1` (2 digits), `[Concluida]` — no "did you mean". [B8, B17]
- MD-4 verify without tag: "0/0 ACs" message does not say `@spec:` was missing from the title. [I12]
- MD-5 vitest-json fallback looks for the first `{` in stdout — fragile with logs. [E9 — friendly but cryptic error]
- MD-6 `exitcode` reporter gives PASS proof to ALL ACs (defended only by AC_SEM_TESTE). [E5]

## SKILL-LEVEL — unfit as a harness skill

- SK-1 SKILL.md drives everything via the `onp-spec` CLI (npx/global install). Without the CLI the skill is dead letter; in sandbox/offline it fails. The user decided: **it must not depend on a CLI**.
- SK-2 No bounded correction loop: if the audit fails, the skill does not say how many iterations to try or when to escalate to the user.
- SK-3 No per-task atomic commit instructions, no context-loading strategy (when to read `references/`), no "safety valve" for auto-sizing.
- SK-4 No instruction on what to do when the environment has no `node`/test runner (graceful degradation).
- SK-5 Skill installed via `init --agents claude` is a COPY — silent divergence between repo and projects.

## What works well (do not regress)

- Findings catalog with stable codes and file:line — excellent.
- US→AC→T→test traceability and conservative rule (1 failure brings the AC down) [E6].
- Global ID continuity on `new` [I13]; cross-feature ID_DUPLICADO [B9].
- ASM_ABERTA blocking `implementada` [B15]; --ci escalation.
- Rewritable fail→pass proof [I8]; corrupted verification → clear error [I9]; VERIFY_OBSOLETO by mtime [E8].
- Friendly errors in the bin (central catch) [A9, E3, E11, F7]; optimal scale (600 ACs in 52ms) [G1]; 5MB specs ok [G3].
- Scaffold generates valid JS/PY even with hostile titles [F4, F6]; nested describe test works [E7].
