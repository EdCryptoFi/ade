// Regressions from the 17/07/2026 adversarial battery (docs/ACHADOS-teste-exaustivo.md).
// Each test corresponds to a finding CR-x / AL-x / MD-x that MUST stay fixed.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig } from '../src/config.js';
import { loadProject } from '../src/core/project.js';
import { auditProject } from '../src/core/audit.js';
import { parseTap, parseJsonReport, resultsByTag } from '../src/core/verify.js';
import { parseTasks } from '../src/parsers/tasks.js';
import { parseSpec, allAcs } from '../src/parsers/spec.js';
import { parseConstitution } from '../src/parsers/constitution.js';
import { grepPattern } from '../src/parsers/annotations.js';

const roots = [];
function tracked(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'onpspec-adv-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}
function audit(root, opts = {}) {
  return auditProject(loadProject(loadConfig(root)), opts);
}
after(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

const SPEC_MIN = `# Spec: F

> feature: f
> status: draft

## Stories

### US-001 — H

Como dev, quero.

#### AC-001 — C

- **Given** x
- **When** y
- **Then** z

## Assumptions

| ID | Assumption | Status | Resolution |
|---|---|---|---|

## Open Questions

| ID | Question | Status | Answer |
|---|---|---|---|
`;

// ---------- CR-1: skip/todo is never proof ----------

test('CR-1: TAP "# SKIP" does not count as pass', () => {
  const tests = parseTap(`TAP version 13\nok 1 - AC-001: pulado @spec:AC-001 # SKIP motivo\n1..1\n`);
  assert.equal(tests.length, 1);
  assert.equal(tests[0].pass, false);
  assert.equal(tests[0].skip, true);
  const { acResults } = resultsByTag(tests);
  assert.equal(acResults['AC-001'].status, 'skip');
});

test('CR-1: TAP "# TODO" does not count as pass', () => {
  const tests = parseTap(`ok 1 - AC-002: futuro @spec:AC-002 # TODO depois\n`);
  assert.equal(tests[0].skip, true);
});

test('CR-1: JSON reporter with skipped/pending/todo status is not proof', () => {
  const tests = parseJsonReport(
    JSON.stringify({
      testResults: [
        {
          assertionResults: [
            { title: 'a @spec:AC-001', status: 'skipped' },
            { title: 'b @spec:AC-002', status: 'pending' },
            { title: 'c @spec:AC-003', status: 'todo' },
            { title: 'd @spec:AC-004', status: 'passed' },
          ],
        },
      ],
    })
  );
  const { acResults } = resultsByTag(tests);
  assert.equal(acResults['AC-001'].status, 'skip');
  assert.equal(acResults['AC-002'].status, 'skip');
  assert.equal(acResults['AC-003'].status, 'skip');
  assert.equal(acResults['AC-004'].status, 'pass');
});

test('CR-1: skip + pass of the same AC → pass; skip + fail → fail', () => {
  const both = resultsByTag([
    { title: 'a @spec:AC-001', pass: false, skip: true },
    { title: 'b @spec:AC-001', pass: true, skip: false },
  ]);
  assert.equal(both.acResults['AC-001'].status, 'pass');
  const failing = resultsByTag([
    { title: 'a @spec:AC-001', pass: false, skip: true },
    { title: 'b @spec:AC-001', pass: false, skip: false },
  ]);
  assert.equal(failing.acResults['AC-001'].status, 'fail');
});

test('CR-1: a "skip" proof recorded by verify becomes AC_SEM_PROVA error in the audit', () => {
  const root = tracked({
    '.spec/features/f/spec.md': SPEC_MIN,
    'test/f.test.js': `test('AC-001: pulado @spec:AC-001', () => {});`,
    '.spec/verification/f.json': JSON.stringify({
      feature: 'f',
      timestamp: new Date(Date.now() + 60000).toISOString(),
      results: { 'AC-001': { status: 'skip', testName: 'AC-001: pulado @spec:AC-001 # SKIP', method: 'tap' } },
    }),
  });
  const result = audit(root);
  const f = result.findings.find((x) => x.code === 'AC_SEM_PROVA');
  assert.ok(f, 'AC_SEM_PROVA must exist');
  assert.equal(f.severity, 'error');
  assert.match(f.message, /skip/i);
});

// ---------- CR-2: task status case/accent folding ----------

test('CR-2: "[done]" and "[Done]" count as done (gate preserved)', () => {
  const t1 = parseTasks(`## T-001 — X [done]\n- Refs: AC-001\n`);
  assert.equal(t1.tasks[0].status, 'done');
  const t2 = parseTasks(`## T-002 — Y [Done]\n- Refs: AC-001\n`);
  assert.equal(t2.tasks[0].status, 'done');
  const t3 = parseTasks(`## T-003 — Z [In-Progress]\n`);
  assert.equal(t3.tasks[0].status, 'in-progress');
});

test('CR-2: unknown status becomes TASK_STATUS_INVALIDO (never silent pending)', () => {
  const t = parseTasks(`## T-001 — X [feita]\n- Refs: AC-001\n`);
  assert.equal(t.parseIssues[0].code, 'TASK_STATUS_INVALIDO');
});

test('CR-2 e2e: task [done] without proof generates TASK_CONCLUIDA_SEM_PROVA', () => {
  const root = tracked({
    '.spec/features/f/spec.md': SPEC_MIN,
    '.spec/features/f/tasks.md': `## T-001 — X [done]\n\n- Refs: AC-001\n`,
  });
  const result = audit(root);
  assert.ok(result.findings.some((f) => f.code === 'TASK_CONCLUIDA_SEM_PROVA'));
});

// ---------- CR-4: ReDoS in the constitution ----------

test('CR-4: pathological regex is killed by timeout and becomes a readable error', () => {
  const root = tracked({ 'src/payload.js': 'a'.repeat(64) + 'X' });
  const t0 = Date.now();
  const { error } = grepPattern(root, '(a+)+$', 'src/**/*.js', []);
  const dt = Date.now() - t0;
  assert.ok(dt < 10000, `grep should be killed in <10s (took ${dt}ms)`);
  assert.ok(error && /exceeded/.test(error), `error should mention the timeout: ${error}`);
});

// ---------- CR-5: happy path closes ----------

test('CR-5: base constitution (gate) does not demand a meta test — kind gate satisfies MUST', () => {
  const c = parseConstitution(`# Constitution — v1.1.0\n\n## P-001 [MUST] Executable proof\n\n- verification(gate): intrinsic to the audit\n`);
  assert.equal(c.principles[0].checks[0].kind, 'gate');
  const root = tracked({
    '.spec/constituicao.md': `# Constitution — v1.1.0\n\n## P-001 [MUST] Executable proof\n\n- verification(gate): intrinsic to the audit\n`,
  });
  const result = audit(root);
  assert.ok(!result.findings.some((f) => f.code === 'PRINCIPIO_SEM_VERIFICACAO'));
  assert.ok(!result.findings.some((f) => f.code === 'PRINCIPIO_VIOLADO'));
});

// ---------- AL-1: NFD ----------

test('AL-1: NFD (macOS) spec parses without a false AC_INCOMPLETO', () => {
  const spec = parseSpec(SPEC_MIN.normalize('NFD'));
  const acs = allAcs(spec);
  assert.equal(acs.length, 1);
  assert.equal(acs[0].then.length, 1, 'Then in NFD must match');
});

// ---------- AL-2: path with space ----------

test('AL-2: Files: splits on comma — a path with space survives', () => {
  const t = parseTasks(`## T-001 — X [pending]\n- Files: src/meu arquivo.js, src/outro.js\n`);
  assert.deepEqual(t.tasks[0].files, ['src/meu arquivo.js', 'src/outro.js']);
});

// ---------- AL-3: indented and case-insensitive GWT ----------

test('AL-3: indented (2 spaces) GWT and lowercase **given** are accepted', () => {
  const spec = parseSpec(
    SPEC_MIN.replace('- **Given** x', '  - **given** x').replace('- **When** y', '  * **When** y')
  );
  const ac = allAcs(spec)[0];
  assert.equal(ac.given.length, 1);
  assert.equal(ac.when.length, 1);
  assert.equal(ac.then.length, 1);
});

// ---------- AL-4: glob with no files ----------

test('AL-4: verification(required) with a glob matching 0 files → GLOB_SEM_ARQUIVOS', () => {
  const root = tracked({
    '.spec/constituicao.md': `# Constitution — v1.0.0\n\n## P-010 [MUST] Auth on every route\n\n- verification(required): \`checarAuth\\(\` in \`src/rotas-typo/**/*.js\`\n`,
  });
  const result = audit(root);
  assert.ok(result.findings.some((f) => f.code === 'GLOB_SEM_ARQUIVOS'));
});

test('AL-4b: invalid regex is reported even with a glob matching 0 files', () => {
  const root = tracked({
    '.spec/constituicao.md': `# Constitution — v1.0.0\n\n## P-001 [MUST] Broken regex\n\n- verification(forbidden): \`([invalida\` in \`src/**/*.js\`\n`,
  });
  const result = audit(root);
  assert.ok(result.findings.some((f) => f.code === 'VERIFICACAO_MALFORMADA'));
});

// ---------- AL-5: unknown level ----------

test('AL-5: level [OBRIGATORIO] generates NIVEL_INVALIDO and the principle does NOT disappear', () => {
  const c = parseConstitution(`# Constitution — v1.0.0\n\n## P-001 [OBRIGATORIO] Wrong level\n\n- verification(test): @principle:P-001\n`);
  assert.ok(c.parseIssues.some((i) => i.code === 'NIVEL_INVALIDO'));
  assert.equal(c.principles.length, 1, 'the principle must still be registered');
  assert.equal(c.principles[0].checks.length, 1);
});

// ---------- AL-6: required sections missing ----------

test('AL-6: spec without Assumptions/Open Questions → SECAO_AUSENTE (error when mature)', () => {
  const bare = `# Spec: F\n\n> feature: f\n> status: implemented\n\n## Stories\n\n### US-001 — H\n\n#### AC-001 — C\n\n- **Given** x\n- **When** y\n- **Then** z\n`;
  const root = tracked({
    '.spec/features/f/spec.md': bare,
    'test/f.test.js': `test('AC-001 @spec:AC-001', () => {});`,
  });
  const result = audit(root);
  const secoes = result.findings.filter((f) => f.code === 'SECAO_AUSENTE');
  assert.equal(secoes.length, 2, 'Assumptions AND Open Questions missing');
  assert.ok(secoes.every((f) => f.severity === 'error'), 'error with implemented status');
});

// ---------- AL-7/MD-6: exitcode restricted to annotated AC ----------
// (covered via runVerify in cli.e2e; here we guarantee the PROVA_FRACA warning)

test('MD-6: proof via exitcode generates PROVA_FRACA in the audit', () => {
  const root = tracked({
    '.spec/features/f/spec.md': SPEC_MIN,
    'test/f.test.js': `test('AC-001: x @spec:AC-001', () => {});`,
    '.spec/verification/f.json': JSON.stringify({
      feature: 'f',
      timestamp: new Date(Date.now() + 60000).toISOString(),
      results: { 'AC-001': { status: 'pass', testName: null, method: 'exitcode' } },
    }),
  });
  const result = audit(root);
  assert.ok(result.findings.some((f) => f.code === 'PROVA_FRACA'));
});

// ---------- MD-1: global refs ----------

test('MD-1: cross-feature ref is NOT REF_QUEBRADA and covers the AC', () => {
  const specB = SPEC_MIN.replace('US-001', 'US-002').replace('AC-001', 'AC-002').replace('feature: f', 'feature: b');
  const root = tracked({
    '.spec/features/a/spec.md': SPEC_MIN.replace('feature: f', 'feature: a'),
    '.spec/features/b/spec.md': specB,
    '.spec/features/b/tasks.md': `## T-001 — Usa AC de a [pending]\n\n- Refs: AC-001, AC-002\n- Files: src/x.js\n`,
    'src/x.js': '// impl',
  });
  const result = audit(root);
  assert.ok(!result.findings.some((f) => f.code === 'REF_QUEBRADA'), 'AC-001 exists globally');
  assert.ok(!result.findings.some((f) => f.code === 'AC_SEM_TASK'), 'both covered');
});

test('MD-1: ref to an AC missing in ANY spec is still REF_QUEBRADA', () => {
  const root = tracked({
    '.spec/features/f/spec.md': SPEC_MIN,
    '.spec/features/f/tasks.md': `## T-001 — X [pending]\n\n- Refs: AC-999\n`,
  });
  const result = audit(root);
  assert.ok(result.findings.some((f) => f.code === 'REF_QUEBRADA'));
});

// ---------- MD-2: divergent feature ----------

test('MD-2: "> feature:" different from the directory → FEATURE_DIVERGENTE', () => {
  const root = tracked({
    '.spec/features/nome-do-dir/spec.md': SPEC_MIN, // > feature: f
  });
  const result = audit(root);
  assert.ok(result.findings.some((f) => f.code === 'FEATURE_DIVERGENTE'));
});

// ---------- MD-3: short IDs ----------

test('MD-3: US-1/AC-1 (fewer than 3 digits) generate the ID_CURTO hint', () => {
  const spec = parseSpec(`# Spec: F\n\n## Stories\n\n### US-1 — H\n\n#### AC-1 — C\n`);
  const shorts = spec.parseIssues.filter((i) => i.code === 'ID_CURTO');
  assert.equal(shorts.length, 2);
  assert.match(shorts[0].message, /US-001/);
});
