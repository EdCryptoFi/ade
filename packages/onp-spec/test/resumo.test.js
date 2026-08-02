// General progress summary: the engine reports what it sees (deterministic),
// the AI records over it (--gravar --texto), and freshness decides which one
// counts — a stale AI summary claiming "running" would be a lie.

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { registrarEvento, lerEventos, montarArvore, caminhos, caminhoStream } from '../src/core/ledger.js';
import {
  resumoDeterministico,
  contextoParaIa,
  montarResumoAtual,
  registrarResumo,
  execucaoAlvo,
  ultimaAcao,
  tabelaAndamento,
  FRESCOR_IA_MS,
} from '../src/core/resumo.js';

let home;
const antes = process.env.ONP_SPEC_HOME;
before(() => {
  home = mkdtempSync(path.join(os.tmpdir(), 'onpspec-resumo-'));
  process.env.ONP_SPEC_HOME = home;
});
after(() => {
  if (antes === undefined) delete process.env.ONP_SPEC_HOME;
  else process.env.ONP_SPEC_HOME = antes;
  rmSync(home, { recursive: true, force: true });
});
beforeEach(() => {
  rmSync(caminhos().dir, { recursive: true, force: true });
});

function plano(runId = 'run-r') {
  registrarEvento({
    tipo: 'plano',
    runId,
    projeto: 'repo-a',
    projetoDir: '/tmp/repo-a',
    feature: 'pagamentos',
    agent: 'claude',
    plano: {
      runId,
      branchTrabalho: 'spec/pagamentos',
      baseDir: '.spec/features/pagamentos',
      ondas: [['faixa-1', 'faixa-2']],
      faixas: [
        {
          id: 'faixa-1',
          branch: 'spec/pagamentos-faixa-1',
          worktree: '../wt-1',
          tarefas: [{ id: 'T-001', titulo: 'Modelo de cobrança', modelo: 'claude-sonnet-5', esforco: 'medium', arquivos: ['a'] }],
        },
        {
          id: 'faixa-2',
          branch: 'spec/pagamentos-faixa-2',
          worktree: '../wt-2',
          tarefas: [{ id: 'T-002', titulo: 'Recibo', modelo: 'claude-opus-5', esforco: 'high', arquivos: ['b'] }],
        },
      ],
      sequenciais: [],
    },
  });
  return runId;
}

test('empty: the engine summary explains the next step instead of staying silent', () => {
  assert.match(resumoDeterministico([]), /No execution in the ledger/);
});

test('engine narrates: done count and the running task with the model\'s last action', () => {
  const runId = plano();
  registrarEvento({ tipo: 'tarefa', runId, faixa: 'faixa-1', tarefa: 'T-001', estado: 'running', stream: 'faixa-1--T-001' });
  mkdirSync(path.dirname(caminhoStream(runId, 'faixa-1--T-001')), { recursive: true });
  writeFileSync(
    caminhoStream(runId, 'faixa-1--T-001'),
    '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"npm test"}}]}}\n'
  );

  const texto = resumoDeterministico(montarArvore(lerEventos()));
  assert.match(texto, /"pagamentos" \(repo-a\): 0 of 2/);
  assert.match(texto, /Running now: T-001 \(Modelo de cobrança\) in faixa-1/);
  assert.match(texto, /last action: Bash: npm test/);
});

test('engine does not announce victory without the audit: a pending gate is told as pending', () => {
  const runId = plano();
  registrarEvento({ tipo: 'tarefa', runId, faixa: 'faixa-1', tarefa: 'T-001', estado: 'done' });
  registrarEvento({ tipo: 'tarefa', runId, faixa: 'faixa-2', tarefa: 'T-002', estado: 'done' });
  const texto = resumoDeterministico(montarArvore(lerEventos()));
  assert.match(texto, /gate \(verify \+ audit\) still pending/);
  assert.doesNotMatch(texto, /aligned/);
});

test('a failure asks for the agent; a conflict asks for resolution', () => {
  const runId = plano();
  registrarEvento({ tipo: 'faixa', runId, faixa: 'faixa-1', estado: 'failed' });
  registrarEvento({ tipo: 'faixa', runId, faixa: 'faixa-2', estado: 'conflict' });
  registrarEvento({ tipo: 'end', runId, exit: 1, escopo: 'all' });
  const texto = resumoDeterministico(montarArvore(lerEventos()));
  assert.match(texto, /Lane faixa-1 failed — ask the agent/);
  assert.match(texto, /Lane faixa-2 stopped on a MERGE CONFLICT/);
});

test('montarResumoAtual: fresh AI wins; stale AI loses to the engine', () => {
  const runId = plano();
  registrarEvento({ tipo: 'tarefa', runId, faixa: 'faixa-1', tarefa: 'T-001', estado: 'running' });
  registrarEvento({ tipo: 'resumo', runId, texto: 'O modelo está corrigindo o webhook do PSP.', origem: 'ai' });

  const arvore = montarArvore(lerEventos());
  const fresco = montarResumoAtual(arvore);
  assert.equal(fresco.origem, 'ai');
  assert.match(fresco.texto, /webhook/);

  const depois = Date.now() + FRESCOR_IA_MS + 1000;
  const velho = montarResumoAtual(arvore, { agora: depois });
  assert.equal(velho.origem, 'engine', 'stale AI summary cannot pretend to be real time');
});

test('registrarResumo normalizes spaces, truncates huge text and requires runId', () => {
  const runId = plano();
  const r = registrarResumo({ runId, texto: '  linha 1\n\nlinha   2  ', origem: 'ai' });
  assert.equal(r.texto, 'linha 1 linha 2');
  const eventos = lerEventos().filter((e) => e.tipo === 'resumo');
  assert.equal(eventos.length, 1);
  assert.equal(eventos[0].origem, 'ai');

  const grande = registrarResumo({ runId, texto: 'x'.repeat(5000) });
  assert.equal(grande.texto.length, 1200);
  assert.ok(registrarResumo({ runId: null, texto: 'x' }).erro);
  assert.ok(registrarResumo({ runId, texto: '   ' }).erro);
});

test('execucaoAlvo: prefers the running one; --run forces; empty returns null', () => {
  const a = plano('run-a');
  registrarEvento({ tipo: 'end', runId: a, exit: 0, escopo: 'all' });
  const b = plano('run-b');
  registrarEvento({ tipo: 'tarefa', runId: b, faixa: 'faixa-1', tarefa: 'T-001', estado: 'running' });

  const arvore = montarArvore(lerEventos());
  assert.equal(execucaoAlvo(arvore).runId, 'run-b', 'the running execution is the natural target');
  assert.equal(execucaoAlvo(arvore, { runId: 'run-a' }).runId, 'run-a');
  assert.equal(execucaoAlvo(arvore, { runId: 'fantasma' }), null);
  assert.equal(execucaoAlvo([]), null);
});

test('ultimaAcao reads only the tail of the stream and tolerates a missing file', () => {
  const runId = plano();
  const chave = 'faixa-1--T-001';
  mkdirSync(path.dirname(caminhoStream(runId, chave)), { recursive: true });
  const enchimento = Array.from({ length: 200 }, () =>
    JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ok'.repeat(40) }] } })
  );
  enchimento.push(
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Edit', input: { file_path: '/x/y.js', old_string: 'a' } }] } })
  );
  writeFileSync(caminhoStream(runId, chave), enchimento.join('\n'));
  assert.match(ultimaAcao(runId, chave), /^Edit: .*y\.js — a/);
  assert.equal(ultimaAcao(runId, 'nao--existe'), null);
});

test('ultimaAcao understands the Cursor CLI tool_call (including started, still running)', () => {
  const runId = plano();
  const chave = 'faixa-1--T-002';
  mkdirSync(path.dirname(caminhoStream(runId, chave)), { recursive: true });
  writeFileSync(
    caminhoStream(runId, chave),
    [
      '{"type":"system","subtype":"init","session_id":"abc","model":"composer"}',
      '{"type":"tool_call","subtype":"started","call_id":"c1","tool_call":{"shellToolCall":{"args":{"command":"node --test"}}}}',
    ].join('\n')
  );
  assert.equal(ultimaAcao(runId, chave), 'Bash: node --test', 'started shows what runs NOW');

  writeFileSync(
    caminhoStream(runId, chave),
    '{"type":"tool_call","subtype":"completed","call_id":"c2","tool_call":{"readToolCall":{"args":{"path":"/a/b/spec.md"},"result":{"success":{"content":"x"}}}}}\n'
  );
  assert.equal(ultimaAcao(runId, chave), 'Read: a/b/spec.md');
});

test('tabelaAndamento: one row per task, with where it runs, status and last action', () => {
  const runId = plano();
  registrarEvento({ tipo: 'tarefa', runId, faixa: 'faixa-1', tarefa: 'T-001', estado: 'running', stream: 'faixa-1--T-001' });
  mkdirSync(path.dirname(caminhoStream(runId, 'faixa-1--T-001')), { recursive: true });
  writeFileSync(
    caminhoStream(runId, 'faixa-1--T-001'),
    '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"npm test | tee log"}}]}}\n'
  );

  const md = tabelaAndamento(montarArvore(lerEventos()));
  assert.match(md, /\*\*pagamentos\*\* \(repo-a\) — 0 of 2 task\(s\) done/);
  assert.match(md, /RUNNING/);
  assert.match(md, /\| task \| title \| where \| status \| last action \|/);
  assert.match(md, /\| T-001 \| Modelo de cobrança \| faixa-1 \| ▶️ running \| Bash: npm test \\\| tee log \|/, 'pipe in the cell is escaped');
  assert.match(md, /\| T-002 \| Recibo \| faixa-2 \| ⏳ pending \| — \|/);
});

test('tabelaAndamento: done/failed appear; the footer brings the failed lane and the gate', () => {
  const runId = plano();
  registrarEvento({ tipo: 'tarefa', runId, faixa: 'faixa-1', tarefa: 'T-001', estado: 'done' });
  registrarEvento({ tipo: 'tarefa', runId, faixa: 'faixa-2', tarefa: 'T-002', estado: 'failed' });
  registrarEvento({ tipo: 'faixa', runId, faixa: 'faixa-2', estado: 'failed' });
  registrarEvento({ tipo: 'gate', runId, etapa: 'verify', exit: 0 });
  registrarEvento({ tipo: 'gate', runId, etapa: 'audit', exit: 1 });
  registrarEvento({ tipo: 'end', runId, exit: 1, escopo: 'all' });

  const md = tabelaAndamento(montarArvore(lerEventos()));
  assert.match(md, /1 of 2 task\(s\) done/);
  assert.match(md, /\| T-001 .* ✅ done /);
  assert.match(md, /\| T-002 .* ❌ failed /);
  assert.match(md, /faixa-2 failed \(re-run: --faixa faixa-2\)/);
  assert.match(md, /verify exit 0 · audit exit 1/);
  assert.doesNotMatch(md, /RUNNING/);
});

test('tabelaAndamento: empty explains the next step; with nothing running shows the most recent', () => {
  assert.match(tabelaAndamento([]), /No execution in the ledger/);
  const runId = plano();
  registrarEvento({ tipo: 'end', runId, exit: 0, escopo: 'all' });
  const md = tabelaAndamento(montarArvore(lerEventos()));
  assert.match(md, /\| T-001 \|/, 'the most recent execution appears even when stopped');
});

test('contextoParaIa lists lanes and tasks of the running execution', () => {
  const runId = plano();
  registrarEvento({ tipo: 'faixa', runId, faixa: 'faixa-1', estado: 'running', tentativa: 1 });
  registrarEvento({ tipo: 'tarefa', runId, faixa: 'faixa-1', tarefa: 'T-001', estado: 'running' });
  const ctx = contextoParaIa(montarArvore(lerEventos()));
  assert.match(ctx, /Mechanical state:/);
  assert.match(ctx, /pagamentos\/faixa-1: running/);
  assert.match(ctx, /T-001 \[running\] Modelo de cobrança/);
});
