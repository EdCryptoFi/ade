// End-to-end test of the real flow:
// init → new → write spec → scaffold → verify (tests fail) →
// implement → verify (passes) → clean audit --ci.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(__dirname, '..', 'bin', 'onp-spec.js');

const root = mkdtempSync(path.join(os.tmpdir(), 'onpspec-e2e-'));
after(() => rmSync(root, { recursive: true, force: true }));

function cli(...args) {
  const proc = spawnSync('node', [BIN, ...args], { cwd: root, encoding: 'utf-8' });
  return { code: proc.status, out: `${proc.stdout}\n${proc.stderr}` };
}

const SPEC = `# Spec: Entrega de dever

> feature: entrega-dever
> status: in-implementation

## Stories

### US-001 — Aluno entrega dever

Como aluno, quero enviar meu dever, para que o professor corrija.

#### AC-001 — Entrega no prazo

- **Given** um aluno com tarefa aberta
- **When** envia antes do prazo
- **Then** status é "no prazo"

## Assumptions

| ID | Assumption | Status | Resolution |
|---|---|---|---|
| ASM-001 | Sem reenvio | confirmed | ok |

## Open Questions

| ID | Question | Status | Answer |
|---|---|---|---|
`;

test('init creates .spec, preset constitution and config', () => {
  const { code, out } = cli('init', '--preset', 'lgpd-educacao');
  assert.equal(code, 0, out);
  assert.ok(existsSync(path.join(root, '.spec', 'constituicao.md')));
  assert.ok(existsSync(path.join(root, 'onpspec.config.json')));
  const constitution = readFileSync(path.join(root, '.spec', 'constituicao.md'), 'utf-8');
  assert.match(constitution, /LGPD/);
  assert.match(constitution, /P-001 \[MUST\]/);
});

test('new creates the feature with templates', () => {
  const { code, out } = cli('new', 'entrega-dever');
  assert.equal(code, 0, out);
  assert.ok(existsSync(path.join(root, '.spec', 'features', 'entrega-dever', 'spec.md')));
});

test('audit reports AC_SEM_TESTE before the scaffold', () => {
  writeFileSync(path.join(root, '.spec', 'features', 'entrega-dever', 'spec.md'), SPEC);
  // remove the template tasks so this step stays clean
  rmSync(path.join(root, '.spec', 'features', 'entrega-dever', 'tasks.md'));
  const { code, out } = cli('audit');
  assert.equal(code, 1);
  assert.match(out, /AC_SEM_TESTE/);
});

test('scaffold generates a failing test with the @spec tag', () => {
  const { code, out } = cli('scaffold', 'entrega-dever');
  assert.equal(code, 0, out);
  const testFile = path.join(root, 'test', 'entrega-dever.spec.test.js');
  assert.ok(existsSync(testFile));
  const content = readFileSync(testFile, 'utf-8');
  assert.match(content, /@spec:AC-001/);
  assert.match(content, /Given: um aluno com tarefa aberta/);
});

test('verify with a failing test records fail and exits 1', () => {
  const { code, out } = cli('verify', 'entrega-dever');
  assert.equal(code, 1, out);
  const record = JSON.parse(
    readFileSync(path.join(root, '.spec', 'verification', 'entrega-dever.json'), 'utf-8')
  );
  assert.equal(record.results['AC-001'].status, 'fail');
});

test('after implementing, verify passes and audit --ci closes the cycle', () => {
  // "implements": a real passing test + tasks + the constitution's principle tests
  mkdirSync(path.join(root, 'src'), { recursive: true });
  writeFileSync(
    path.join(root, 'src', 'entrega.js'),
    `export function statusEntrega(enviadoEm, prazo) {\n  return enviadoEm <= prazo ? 'no prazo' : 'atrasada';\n}\n`
  );
  writeFileSync(
    path.join(root, 'test', 'entrega-dever.spec.test.js'),
    `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusEntrega } from '../src/entrega.js';

test('AC-001: entrega no prazo @spec:AC-001', () => {
  assert.equal(statusEntrega(1, 2), 'no prazo');
});
test('nota nunca exposta @principle:P-001', () => { assert.ok(true); });
test('acesso a nota registrado @principle:P-002', () => { assert.ok(true); });
test('menores com base legal @principle:P-003', () => { assert.ok(true); });
`
  );
  writeFileSync(
    path.join(root, '.spec', 'features', 'entrega-dever', 'tasks.md'),
    `# Tasks\n\n## T-001 — Função de status [done]\n\n- Refs: US-001, AC-001\n- Files: src/entrega.js\n`
  );

  const verify = cli('verify', 'entrega-dever');
  assert.equal(verify.code, 0, verify.out);

  const audit = cli('audit', '--ci');
  assert.equal(audit.code, 0, audit.out);
  assert.match(audit.out, /clean audit/);
});

test('drift is caught: renaming the AC in the spec breaks the audit', () => {
  const drifted = SPEC.replace(/AC-001/g, 'AC-050');
  writeFileSync(path.join(root, '.spec', 'features', 'entrega-dever', 'spec.md'), drifted);
  const { code, out } = cli('audit', '--ci');
  assert.equal(code, 1);
  assert.match(out, /TESTE_ORFAO/); // the test points to AC-001, which no longer exists
  assert.match(out, /AC_SEM_TESTE/); // the new AC-050 has no test
  // restore
  writeFileSync(path.join(root, '.spec', 'features', 'entrega-dever', 'spec.md'), SPEC);
});

test('status and assumptions run without error', () => {
  assert.equal(cli('status').code, 0);
  assert.equal(cli('assumptions').code, 0);
});
