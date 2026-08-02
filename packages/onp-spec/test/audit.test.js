import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig } from '../src/config.js';
import { loadProject } from '../src/core/project.js';
import { auditProject } from '../src/core/audit.js';

// Builds a real project on disk and runs the audit over it.

function makeProject(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'onpspec-audit-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

function audit(root, opts = {}) {
  const config = loadConfig(root);
  const project = loadProject(config);
  return auditProject(project, opts);
}

const SPEC = `# Spec: Entrega

> feature: entrega
> status: in-implementation

## Stories

### US-001 — Aluno entrega dever

Como aluno, quero enviar, para que corrijam.

#### AC-001 — Entrega no prazo

- **Given** aluno autenticado
- **When** envia antes do prazo
- **Then** registra "no prazo"

## Assumptions

| ID | Assumption | Status | Resolution |
|---|---|---|---|
| ASM-001 | Sem reenvio | confirmed | decidido 17/07 |

## Open Questions

| ID | Question | Status | Answer |
|---|---|---|---|
`;

const roots = [];
function tracked(files) {
  const r = makeProject(files);
  roots.push(r);
  return r;
}
after(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

test('AC_SEM_TESTE: AC with no @spec tag in any test', () => {
  const root = tracked({ '.spec/features/entrega/spec.md': SPEC });
  const result = audit(root);
  assert.ok(result.findings.some((f) => f.code === 'AC_SEM_TESTE'));
  assert.equal(result.ok, false);
});

test('AC with an annotated test does not raise AC_SEM_TESTE, but raises AC_SEM_PROVA (warning) without verify', () => {
  const root = tracked({
    '.spec/features/entrega/spec.md': SPEC,
    'test/entrega.test.js': `test('AC-001: on time @spec:AC-001', () => {});`,
  });
  const result = audit(root);
  assert.ok(!result.findings.some((f) => f.code === 'AC_SEM_TESTE'));
  const proof = result.findings.find((f) => f.code === 'AC_SEM_PROVA');
  assert.ok(proof);
  assert.equal(proof.severity, 'warning');
});

test('--ci escalates AC_SEM_PROVA to error (anti premature victory)', () => {
  const root = tracked({
    '.spec/features/entrega/spec.md': SPEC,
    'test/entrega.test.js': `test('AC-001: on time @spec:AC-001', () => {});`,
  });
  const result = audit(root, { ci: true });
  const proof = result.findings.find((f) => f.code === 'AC_SEM_PROVA');
  assert.equal(proof.severity, 'error');
  assert.equal(result.ok, false);
});

test('recorded verify PASS clears AC_SEM_PROVA', () => {
  const root = tracked({
    '.spec/features/entrega/spec.md': SPEC,
    'test/entrega.test.js': `test('AC-001: on time @spec:AC-001', () => {});`,
    '.spec/verification/entrega.json': JSON.stringify({
      feature: 'entrega',
      timestamp: new Date(Date.now() + 60_000).toISOString(),
      results: { 'AC-001': { status: 'pass', testName: 'AC-001 @spec:AC-001' } },
    }),
  });
  const result = audit(root, { ci: true });
  assert.ok(!result.findings.some((f) => f.code === 'AC_SEM_PROVA'), JSON.stringify(result.findings));
  assert.equal(result.ok, true);
});

test('TESTE_ORFAO: tag points to an AC that does not exist (drift)', () => {
  const root = tracked({
    '.spec/features/entrega/spec.md': SPEC,
    'test/entrega.test.js': `test('AC-001 ok @spec:AC-001', () => {});\ntest('ghost @spec:AC-999', () => {});`,
  });
  const result = audit(root);
  const orphan = result.findings.find((f) => f.code === 'TESTE_ORFAO');
  assert.ok(orphan);
  assert.match(orphan.message, /AC-999/);
});

test('ASM_ABERTA: open assumption with implemented feature is an error', () => {
  const spec = SPEC.replace('status: in-implementation', 'status: implemented').replace(
    '| ASM-001 | Sem reenvio | confirmed | decidido 17/07 |',
    '| ASM-001 | Sem reenvio | open | — |'
  );
  const root = tracked({
    '.spec/features/entrega/spec.md': spec,
    'test/entrega.test.js': `test('AC-001 @spec:AC-001', () => {});`,
  });
  const result = audit(root);
  const asm = result.findings.find((f) => f.code === 'ASM_ABERTA');
  assert.ok(asm);
  assert.equal(asm.severity, 'error');
});

test('REF_QUEBRADA and TASK_CONCLUIDA_SEM_PROVA', () => {
  const root = tracked({
    '.spec/features/entrega/spec.md': SPEC,
    '.spec/features/entrega/tasks.md': `# Tasks\n\n## T-001 — Modelo [done]\n\n- Refs: AC-001, AC-777\n- Files: src/models/entrega.js\n`,
    'src/models/entrega.js': `export const x = 1;`,
    'test/entrega.test.js': `test('AC-001 @spec:AC-001', () => {});`,
  });
  const result = audit(root);
  assert.ok(result.findings.some((f) => f.code === 'REF_QUEBRADA' && /AC-777/.test(f.message)));
  assert.ok(result.findings.some((f) => f.code === 'TASK_CONCLUIDA_SEM_PROVA'));
});

test('ARQUIVO_ORFAO: code not mapped by any task', () => {
  const root = tracked({
    '.spec/features/entrega/spec.md': SPEC,
    '.spec/features/entrega/tasks.md': `# Tasks\n\n## T-001 — Modelo [pending]\n\n- Refs: AC-001\n- Files: src/models/entrega.js\n`,
    'src/models/entrega.js': `export const x = 1;`,
    'src/models/intruso.js': `export const y = 2;`,
    'test/entrega.test.js': `test('AC-001 @spec:AC-001', () => {});`,
  });
  const result = audit(root);
  const orphan = result.findings.find((f) => f.code === 'ARQUIVO_ORFAO');
  assert.ok(orphan);
  assert.match(orphan.message, /intruso\.js/);
});

test('ID_DUPLICADO across features', () => {
  const spec2 = SPEC.replace('feature: entrega', 'feature: outra');
  const root = tracked({
    '.spec/features/entrega/spec.md': SPEC,
    '.spec/features/outra/spec.md': spec2,
    'test/t.test.js': `test('AC-001 @spec:AC-001', () => {});`,
  });
  const result = audit(root);
  assert.ok(result.findings.some((f) => f.code === 'ID_DUPLICADO'));
});

test('PRINCIPIO_SEM_VERIFICACAO: MUST without check is an error', () => {
  const root = tracked({
    '.spec/constituicao.md': `# Constitution — v1.0.0\n\n## P-001 [MUST] No verification\n\nTexto.\n`,
    '.spec/features/entrega/spec.md': SPEC,
    'test/entrega.test.js': `test('AC-001 @spec:AC-001', () => {});`,
  });
  const result = audit(root);
  assert.ok(result.findings.some((f) => f.code === 'PRINCIPIO_SEM_VERIFICACAO'));
});

test('PRINCIPIO_VIOLADO: forbidden pattern found with file:line', () => {
  const root = tracked({
    '.spec/constituicao.md': `# Constitution — v1.0.0\n\n## P-004 [MUST] No personal data in logs\n\n- verification(forbidden): \`console\\.log\\(.*cpf\` in \`src/**/*.js\`\n`,
    '.spec/features/entrega/spec.md': SPEC,
    'src/vazamento.js': `console.log('cpf do aluno', cpf);`,
    'test/entrega.test.js': `test('AC-001 @spec:AC-001', () => {});`,
  });
  const result = audit(root);
  const violation = result.findings.find((f) => f.code === 'PRINCIPIO_VIOLADO');
  assert.ok(violation);
  assert.equal(violation.file, 'src/vazamento.js');
  assert.equal(violation.line, 1);
});

test('PRINCIPIO_VIOLADO: required test tag missing', () => {
  const root = tracked({
    '.spec/constituicao.md': `# Constitution — v1.0.0\n\n## P-001 [MUST] Protected grade\n\n- verification(test): @principle:P-001\n`,
    '.spec/features/entrega/spec.md': SPEC,
    'test/entrega.test.js': `test('AC-001 @spec:AC-001', () => {});`,
  });
  const result = audit(root);
  assert.ok(
    result.findings.some((f) => f.code === 'PRINCIPIO_VIOLADO' && /P-001/.test(f.message))
  );
});

test('aligned project: clean audit with exit 0', () => {
  const root = tracked({
    '.spec/constituicao.md': `# Constitution — v1.0.0\n\n## P-001 [MUST] Executable proof\n\n- verification(test): @principle:P-001\n`,
    '.spec/features/entrega/spec.md': SPEC,
    '.spec/features/entrega/tasks.md': `# Tasks\n\n## T-001 — Modelo [done]\n\n- Refs: US-001\n- Files: src/entrega.js\n`,
    'src/entrega.js': `export const entrega = () => 'no prazo';`,
    'test/entrega.test.js': `test('AC-001: no prazo @spec:AC-001', () => {});\ntest('grade protected @principle:P-001', () => {});`,
    '.spec/verification/entrega.json': JSON.stringify({
      feature: 'entrega',
      timestamp: new Date(Date.now() + 60_000).toISOString(),
      results: { 'AC-001': { status: 'pass', testName: 'AC-001 @spec:AC-001' } },
      principles: { 'P-001': { status: 'pass' } },
    }),
  });
  const result = audit(root, { ci: true });
  assert.equal(result.stats.errors, 0, JSON.stringify(result.findings, null, 2));
  assert.equal(result.ok, true);
  assert.equal(result.exitCode, 0);
});
