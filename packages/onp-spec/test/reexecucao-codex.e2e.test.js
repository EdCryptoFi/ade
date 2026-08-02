// E2E of PARITY with the claude test, now on Codex: one lane fails, and you
// can re-run ONLY it. Uses a `codex` stub that emits the real JSONL of
// `codex exec --json` (same event types as the official docs:
// thread.started, turn.*, item.*), so it also proves the stream reaches the
// ledger and that `onp-spec resumo` would have something to narrate.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { lerEventos, montarArvore, lerStream, caminhos } from '../src/core/ledger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(__dirname, '..', 'bin', 'onp-spec.js');

let tmp;
let repo;
let stubDir;
const antes = process.env.ONP_SPEC_HOME;

// stub: emits the SAME event types as `codex exec --json` (JSON Lines),
// really works (file + commit) and fails the tasks listed in
// ONP_STUB_FALHAR — like the claude stub, with the Codex shapes
const STUB = `#!/usr/bin/env bash
[ "\${1:-}" = "exec" ] || { echo "stub: expected the exec subcommand" >&2; exit 2; }
shift
PROMPT="\${1:-}"
TAREFA=$(printf '%s' "$PROMPT" | grep -o 'T-[0-9]\\{3\\}' | head -1)
[ -z "$TAREFA" ] && TAREFA="T-000"
printf '%s\\n' "{\\"type\\":\\"thread.started\\",\\"thread_id\\":\\"thread-$TAREFA\\"}"
printf '%s\\n' "{\\"type\\":\\"turn.started\\"}"
printf '%s\\n' "{\\"type\\":\\"item.started\\",\\"item\\":{\\"id\\":\\"item_0\\",\\"type\\":\\"command_execution\\",\\"command\\":\\"cat spec.md\\",\\"status\\":\\"in_progress\\"}}"
printf '%s\\n' "{\\"type\\":\\"item.completed\\",\\"item\\":{\\"id\\":\\"item_0\\",\\"type\\":\\"command_execution\\",\\"command\\":\\"cat spec.md\\",\\"aggregated_output\\":\\"content\\",\\"exit_code\\":0,\\"status\\":\\"completed\\"}}"
if printf '%s' "\${ONP_STUB_FALHAR:-}" | grep -q "$TAREFA"; then
  printf '%s\\n' "{\\"type\\":\\"item.completed\\",\\"item\\":{\\"id\\":\\"item_1\\",\\"type\\":\\"command_execution\\",\\"command\\":\\"node --test\\",\\"aggregated_output\\":\\"red test\\",\\"exit_code\\":1,\\"status\\":\\"failed\\"}}"
  printf '%s\\n' "{\\"type\\":\\"turn.failed\\",\\"error\\":{\\"message\\":\\"red test\\"}}"
  exit 1
fi
printf 'done by %s\\n' "$TAREFA" > "arquivo-$TAREFA.txt"
printf '%s\\n' "{\\"type\\":\\"item.completed\\",\\"item\\":{\\"id\\":\\"item_2\\",\\"type\\":\\"file_change\\",\\"status\\":\\"completed\\",\\"changes\\":[{\\"path\\":\\"arquivo-$TAREFA.txt\\",\\"kind\\":\\"add\\"}]}}"
git add -A >/dev/null 2>&1
git commit -q -m "$TAREFA: done by the stub" >/dev/null 2>&1
printf '%s\\n' "{\\"type\\":\\"item.completed\\",\\"item\\":{\\"id\\":\\"item_3\\",\\"type\\":\\"agent_message\\",\\"text\\":\\"done by $TAREFA\\"}}"
printf '%s\\n' "{\\"type\\":\\"turn.completed\\",\\"usage\\":{\\"input_tokens\\":100,\\"cached_input_tokens\\":10,\\"output_tokens\\":42}}"
exit 0
`;

const SPEC = `# Spec: Payments

> feature: pagamentos
> status: in-implementation

## Stories

### US-001 — Billing

As a finance person, I want to bill, so that I get paid.

#### AC-001 — Billing created

- **Given** an active student
- **When** the month turns
- **Then** the billing shows up

## Assumptions

| ID | Assumption | Status | Resolution |
|---|---|---|---|

## Open questions

| ID | Question | Status | Answer |
|---|---|---|---|
`;

const TASKS = `# Tasks: Payments

> feature: pagamentos

## T-001 — Modelo [pending]

- Refs: AC-001
- Files: src/a.js

## T-002 — Serviço [pending]

- Refs: AC-001
- Files: src/b.js
`;

function cli(args, extraEnv = {}) {
  return spawnSync('node', [BIN, ...args], {
    cwd: repo,
    encoding: 'utf-8',
    env: { ...process.env, ...extraEnv },
  });
}

function rodarScript(args, extraEnv = {}) {
  return spawnSync('bash', [path.join(repo, '.spec/features/pagamentos/executar-tarefas.sh'), ...args], {
    cwd: repo,
    encoding: 'utf-8',
    env: { ...process.env, PATH: `${stubDir}:${process.env.PATH}`, ...extraEnv },
  });
}

const execucao = () => montarArvore(lerEventos())[0].execucoes[0];
const commits = () =>
  parseInt(spawnSync('git', ['rev-list', '--count', 'HEAD'], { cwd: repo, encoding: 'utf-8' }).stdout.trim(), 10);

before(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), 'onpspec-reexec-codex-'));
  process.env.ONP_SPEC_HOME = path.join(tmp, 'home');
  stubDir = path.join(tmp, 'stub');
  mkdirSync(stubDir, { recursive: true });
  writeFileSync(path.join(stubDir, 'codex'), STUB);
  chmodSync(path.join(stubDir, 'codex'), 0o755);

  repo = path.join(tmp, 'projeto');
  mkdirSync(repo, { recursive: true });
  for (const args of [['init', '-q'], ['config', 'user.email', 't@t.dev'], ['config', 'user.name', 'T']]) {
    spawnSync('git', args, { cwd: repo });
  }
  cli(['init']);
  cli(['new', 'pagamentos']);
  writeFileSync(path.join(repo, '.spec/features/pagamentos/spec.md'), SPEC);
  writeFileSync(path.join(repo, '.spec/features/pagamentos/tasks.md'), TASKS);
  spawnSync('git', ['add', '-A'], { cwd: repo });
  spawnSync('git', ['commit', '-qm', 'spec'], { cwd: repo });
});

after(() => {
  if (antes === undefined) delete process.env.ONP_SPEC_HOME;
  else process.env.ONP_SPEC_HOME = antes;
  spawnSync('git', ['worktree', 'prune'], { cwd: repo });
  rmSync(tmp, { recursive: true, force: true });
  rmSync(path.join(path.dirname(tmp), 'onp-worktrees'), { recursive: true, force: true });
});

test('plano --agents codex records the execution in the global ledger (with project and lanes)', () => {
  const r = cli(['plano', 'pagamentos', '--agents', 'codex']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(caminhos().ledger.startsWith(path.join(tmp, 'home')), 'ledger isolated in the test tmp');
  const ex = execucao();
  assert.equal(ex.feature, 'pagamentos');
  assert.equal(ex.agent, 'codex');
  assert.equal(ex.faixas.length, 2, 'T-001 and T-002 have disjoint files → 2 parallel lanes');
  assert.equal(ex.total, 2);
  assert.equal(ex.fim, null);
});

test('full run via codex exec: lane-2 fails, lane-1 completes and the stream is recorded', () => {
  const r = rodarScript([], { ONP_STUB_FALHAR: 'T-002' });
  assert.equal(r.status, 1, 'exit 1 because there was a failure and the audit does not close');

  const ex = execucao();
  assert.equal(ex.faixas.find((f) => f.id === 'faixa-1').estado, 'merged');
  assert.equal(ex.faixas.find((f) => f.id === 'faixa-2').estado, 'failed');
  assert.equal(ex.faixas.find((f) => f.id === 'faixa-1').tarefas[0].estado, 'done');
  assert.equal(ex.faixas.find((f) => f.id === 'faixa-2').tarefas[0].estado, 'failed');
  assert.equal(ex.fim, 1);
  assert.equal(ex.gate.audit, 1, 'the gate ran and rejected (no tests written)');

  // tasks.md only marked the task that actually passed
  const tasks = readFileSync(path.join(repo, '.spec/features/pagamentos/tasks.md'), 'utf-8');
  assert.match(tasks, /## T-001 — Modelo \[done\]/);
  assert.match(tasks, /## T-002 — Serviço \[pending\]/);

  // model stream (codex JSONL): you can see what happened in each task
  const ok = lerStream(ex.runId, 'faixa-1--T-001');
  assert.equal(ok.existe, true);
  assert.equal(ok.resumo.status, 'success');
  assert.deepEqual(
    ok.itens.filter((i) => i.tipo === 'ferramenta').map((i) => i.nome),
    ['Bash', 'Edit'],
    'codex command_execution and file_change become tools on the timeline'
  );
  assert.ok(ok.itens.some((i) => i.tipo === 'texto' && /done by T-001/.test(i.texto)));

  const falha = lerStream(ex.runId, 'faixa-2--T-002');
  assert.equal(falha.resumo.status, 'error');
  assert.ok(falha.itens.some((i) => i.tipo === 'saida' && i.erro), 'the command with exit 1 shows up as an error in the stream');

  // the exit trap wrote the final summary to the ledger (never silence)
  assert.ok(lerEventos().some((e) => e.tipo === 'resumo' && e.runId === ex.runId));
  // and `onp-spec resumo` narrates the state from what is in the ledger
  const resumo = cli(['resumo', 'pagamentos']);
  assert.equal(resumo.status, 0, resumo.stderr);
  assert.match(resumo.stdout, /Lane faixa-2 failed — ask the agent/);
});

test('re-run ONLY the failed lane: a new attempt, without touching the lane that already passed', () => {
  const antesCommits = commits();
  const arquivoDaFaixa1 = path.join(repo, 'arquivo-T-001.txt');
  const conteudoAntes = readFileSync(arquivoDaFaixa1, 'utf-8');

  const r = rodarScript(['--faixa', 'faixa-2']); // no ONP_STUB_FALHAR: now it passes
  assert.equal(r.status, 1, 'still exit 1: the audit rejects for lack of tests — and that is honest');

  const ex = execucao();
  const f2 = ex.faixas.find((f) => f.id === 'faixa-2');
  assert.equal(f2.estado, 'merged');
  assert.equal(f2.tentativa, 2, 'the re-run counts as attempt 2');
  assert.equal(f2.tarefas[0].estado, 'done');
  // the lane that was already done was not re-run
  assert.equal(ex.faixas.find((f) => f.id === 'faixa-1').tentativa, 1);
  assert.equal(readFileSync(arquivoDaFaixa1, 'utf-8'), conteudoAntes, 'lane-1 work intact');
  assert.equal(ex.escopoUltimo, 'faixa:faixa-2');
  assert.equal(ex.concluidas, 2);

  const tasks = readFileSync(path.join(repo, '.spec/features/pagamentos/tasks.md'), 'utf-8');
  assert.match(tasks, /## T-002 — Serviço \[done\]/);
  assert.ok(commits() > antesCommits, 'the re-run committed on top of what already existed');

  // the stream of the re-run task was replaced by the new attempt's
  assert.equal(lerStream(ex.runId, 'faixa-2--T-002').resumo.status, 'success');
});

test('--sem-gate does not invent a verdict: records a pending state and tells you to run the gate', () => {
  const r = rodarScript(['--faixa', 'faixa-2', '--sem-gate']);
  assert.equal(r.status, 0, 'the work finished fine');
  assert.match(r.stdout, /WITHOUT the gate/);
  assert.match(r.stdout, /NOT proof of anything/);
  assert.doesNotMatch(r.stdout, /audit exit 0/, 'never announce alignment without running the audit');
  const ex = execucao();
  assert.equal(ex.fim, 1, 'without a verdict, the execution does not end as "completed"');
  assert.equal(ex.gateDesatualizado, true, 'the summary warns that the gate is stale');
});

test('--gate runs only the gate and returns the fresh verdict', () => {
  const r = rodarScript(['--gate']);
  assert.match(r.stdout, /gate: verify \+ audit --ci/);
  const ex = execucao();
  assert.equal(ex.gateDesatualizado, false);
  assert.equal(ex.gate.audit, 1);
  assert.equal(ex.escopoUltimo, 'gate');
});

test('nonexistent lane fails loudly instead of running the wrong thing', () => {
  const r = rodarScript(['--faixa', 'faixa-99']);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /unknown lane/);
});

test('unknown argument is not silently ignored', () => {
  const r = rodarScript(['--apaga-tudo']);
  assert.equal(r.status, 2);
  assert.match(r.stdout + r.stderr, /unknown argument/);
});

test('--listar does not need a ready environment and shows the targets', () => {
  const r = rodarScript(['--listar']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /faixa-1\s+wave 1\s+T-001/);
  assert.match(r.stdout, /faixa-2\s+wave 1\s+T-002/);
});

test('worktrees of merged lanes were removed at the end', () => {
  const lista = spawnSync('git', ['worktree', 'list'], { cwd: repo, encoding: 'utf-8' }).stdout;
  assert.equal(lista.trim().split('\n').length, 1, `leftover worktree:\n${lista}`);
  assert.ok(!existsSync(path.join(path.dirname(repo), 'onp-worktrees', 'projeto-pagamentos-faixa-2')));
});
