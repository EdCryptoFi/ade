import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSpec, allAcs } from '../src/parsers/spec.js';
import { parseTasks } from '../src/parsers/tasks.js';
import { parseConstitution } from '../src/parsers/constitution.js';
import { globToRegExp } from '../src/util/text.js';

const SPEC_OK = `# Spec: Entrega de dever

> feature: entrega-dever
> status: in-implementation

## Stories

### US-001 — Aluno entrega dever

Como aluno, quero enviar meu dever, para que o professor corrija.

#### AC-001 — Entrega no prazo

- **Given** um aluno autenticado com tarefa aberta
- **When** ele envia o arquivo antes do prazo
- **Then** a entrega é registrada com status "no prazo"

#### AC-002 — Entrega atrasada

- **Given** um aluno autenticado com tarefa aberta
- **When** ele envia depois do prazo
- **Then** a entrega é marcada como "atrasada"
- **And** o aluno vê um aviso de atraso

## Assumptions

| ID | Assumption | Status | Resolution |
|---|---|---|---|
| ASM-001 | Não pode reenviar após correção | open | — |

## Open Questions

| ID | Question | Status | Answer |
|---|---|---|---|
| Q-001 | Fuso do prazo? | answered | America/Sao_Paulo |
`;

test('parseSpec extracts feature, status, US, AC with Given/When/Then', () => {
  const spec = parseSpec(SPEC_OK);
  assert.equal(spec.feature, 'entrega-dever');
  assert.equal(spec.status, 'in-implementation');
  assert.equal(spec.stories.length, 1);
  assert.equal(spec.stories[0].id, 'US-001');
  const acs = allAcs(spec);
  assert.equal(acs.length, 2);
  assert.deepEqual(acs.map((a) => a.id), ['AC-001', 'AC-002']);
  assert.equal(acs[0].given.length, 1);
  assert.equal(acs[0].when.length, 1);
  assert.equal(acs[0].then.length, 1);
});

test('parseSpec: "And" clause continues the last clause (Then)', () => {
  const spec = parseSpec(SPEC_OK);
  const ac2 = allAcs(spec)[1];
  assert.equal(ac2.then.length, 2);
});

test('parseSpec extracts assumptions and questions with status', () => {
  const spec = parseSpec(SPEC_OK);
  assert.equal(spec.assumptions.length, 1);
  assert.deepEqual(spec.assumptions[0], {
    id: 'ASM-001',
    text: 'Não pode reenviar após correção',
    status: 'open',
    resolution: '—',
    line: spec.assumptions[0].line,
  });
  assert.equal(spec.questions.length, 1);
  assert.equal(spec.questions[0].status, 'answered');
  assert.equal(spec.questions[0].answer, 'America/Sao_Paulo');
});

test('parseSpec: section headings are case-insensitive (Assumptions/Open Questions)', () => {
  const mixedCase = SPEC_OK.replace('## Assumptions', '## assumptions').replace(
    '## Open Questions',
    '## Open questions'
  );
  const spec = parseSpec(mixedCase);
  assert.equal(spec.assumptions.length, 1);
  assert.equal(spec.questions.length, 1);
});

test('parseSpec flags an AC outside a US', () => {
  const spec = parseSpec(`# Spec: X\n\n#### AC-001 — Solto\n\n- **Given** x\n- **When** y\n- **Then** z\n`);
  assert.equal(spec.parseIssues.length, 1);
  assert.equal(spec.parseIssues[0].code, 'AC_FORA_DE_US');
});

test('parseTasks extracts id, status, refs and files', () => {
  const tasks = parseTasks(`# Tasks

## T-001 — Modelo de entrega [done]

- Refs: US-001, AC-001
- Files: src/models/entrega.js, src/routes/entrega.js

## T-002 — Aviso de atraso [pending]

- Refs: AC-002
- Files: src/ui/aviso.js
`);
  assert.equal(tasks.tasks.length, 2);
  assert.equal(tasks.tasks[0].status, 'done');
  assert.deepEqual(tasks.tasks[0].refs, ['US-001', 'AC-001']);
  assert.deepEqual(tasks.tasks[0].files, ['src/models/entrega.js', 'src/routes/entrega.js']);
  assert.equal(tasks.tasks[1].status, 'pending');
});

test('parseTasks: task without status becomes pending with a warning', () => {
  const tasks = parseTasks(`## T-001 — Sem status\n- Refs: AC-001\n`);
  assert.equal(tasks.tasks[0].status, 'pending');
  assert.equal(tasks.parseIssues[0].code, 'TASK_SEM_STATUS');
});

test('parseConstitution extracts principles, levels and verifications', () => {
  const c = parseConstitution(`# Constitution — v1.2.0

## P-001 [MUST] Nota nunca exposta a outro aluno

Texto do princípio.

- verification(test): @principle:P-001
- verification(forbidden): \`SELECT \\* FROM notas\` in \`src/**/*.js\`

## P-007 [MAY] Exclusão a pedido
`);
  assert.equal(c.version, '1.2.0');
  assert.equal(c.principles.length, 2);
  assert.equal(c.principles[0].level, 'MUST');
  assert.equal(c.principles[0].checks.length, 2);
  assert.equal(c.principles[0].checks[0].kind, 'test');
  assert.equal(c.principles[0].checks[1].kind, 'forbidden');
  assert.equal(c.principles[0].checks[1].glob, 'src/**/*.js');
  assert.equal(c.principles[1].level, 'MAY');
});

test('globToRegExp: ** matches directories, * does not cross /', () => {
  assert.ok(globToRegExp('src/**').test('src/a/b/c.js'));
  assert.ok(globToRegExp('src/**/*.js').test('src/a/b/c.js'));
  assert.ok(globToRegExp('src/**/*.js').test('src/c.js'));
  assert.ok(!globToRegExp('src/*.js').test('src/a/c.js'));
  assert.ok(globToRegExp('test/**').test('test/x.test.js'));
  assert.ok(!globToRegExp('src/**').test('lib/x.js'));
});
