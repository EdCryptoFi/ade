// Execution plan: grouping into lanes (disjoint files → parallel, shared →
// same lane, no Files → sequential) and the renderers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  montarPlano,
  normalizarEsforco,
  esforcoParaAgente,
  usaExecutorSh,
  renderPlanoMd,
  renderPlanoSh,
  renderPlanoHtml,
  renderPlanoJson,
} from '../src/core/plano.js';
import { DEFAULT_CONFIG } from '../src/config.js';

function projeto({ tasks, specStories = [], rootDir = '/tmp/repo-x' } = {}) {
  return {
    config: { ...DEFAULT_CONFIG, rootDir, testCommand: 'node --test' },
    features: [
      {
        name: 'pagamentos',
        spec: { stories: specStories },
        tasks: { tasks },
      },
    ],
  };
}

function t(id, { files = [], status = 'pending', refs = [], model = null, esforco = null, line = 1 } = {}) {
  return { id, title: `Title ${id}`, status, line, refs, files, model, esforco };
}

test('effort accepts PT and EN and normalizes to the CLI level', () => {
  assert.equal(normalizarEsforco('alto'), 'high');
  assert.equal(normalizarEsforco('Médio'), 'medium');
  assert.equal(normalizarEsforco('xalto'), 'xhigh');
  assert.equal(normalizarEsforco('MAX'), 'max');
  assert.equal(normalizarEsforco('low'), 'low');
  assert.equal(normalizarEsforco('turbo'), null);
});

test('disjoint files → parallel lanes; shared → same lane; no files → sequential', () => {
  const plan = montarPlano(
    projeto({
      tasks: [
        t('T-001', { files: ['src/a.js'], line: 1 }),
        t('T-002', { files: ['src/b.js'], line: 5 }),
        t('T-003', { files: ['src/a.js', 'src/c.js'], line: 9 }),
        t('T-004', { line: 13 }),
      ],
    }),
    'pagamentos',
    { agent: 'claude', enginePath: '/tmp/repo-x/bin/onp-spec.js' }
  );
  assert.ok(!plan.erro, plan.erro);
  assert.equal(plan.faixas.length, 2);
  assert.deepEqual(plan.faixas[0].tasks.map((x) => x.id), ['T-001', 'T-003']);
  assert.deepEqual(plan.faixas[1].tasks.map((x) => x.id), ['T-002']);
  assert.deepEqual(plan.sequenciais.map((x) => x.id), ['T-004']);
  assert.equal(plan.faixas[0].branch, 'spec/pagamentos-faixa-1');
  assert.equal(plan.branchTrabalho, 'spec/pagamentos');
  // engine becomes a path relative to the root
  assert.equal(plan.engine, 'bin/onp-spec.js');
});

test('done tasks stay out; all done is a friendly error', () => {
  const plan = montarPlano(
    projeto({
      tasks: [t('T-001', { files: ['src/a.js'], status: 'done' }), t('T-002', { files: ['src/b.js'] })],
    }),
    'pagamentos',
    {}
  );
  assert.deepEqual(plan.concluidas.map((x) => x.id), ['T-001']);
  assert.equal(plan.faixas.length, 1);

  const vazio = montarPlano(
    projeto({ tasks: [t('T-001', { files: ['src/a.js'], status: 'done' })] }),
    'pagamentos',
    {}
  );
  assert.match(vazio.erro, /already \[done\]/);
});

test('maxParalelas splits the lanes into waves', () => {
  const proj = projeto({
    tasks: [
      t('T-001', { files: ['a'], line: 1 }),
      t('T-002', { files: ['b'], line: 2 }),
      t('T-003', { files: ['c'], line: 3 }),
      t('T-004', { files: ['d'], line: 4 }),
      t('T-005', { files: ['e'], line: 5 }),
    ],
  });
  proj.config.paralelo = { ...proj.config.paralelo, maxParalelas: 2 };
  const plan = montarPlano(proj, 'pagamentos', {});
  assert.equal(plan.faixas.length, 5);
  assert.deepEqual(plan.ondas.map((o) => o.length), [2, 2, 1]);
});

test('per-task model and effort beat the default; invalid effort warns', () => {
  const plan = montarPlano(
    projeto({
      tasks: [
        t('T-001', { files: ['a'], model: 'claude-opus-5', esforco: 'alto' }),
        t('T-002', { files: ['b'], esforco: 'turbo' }),
      ],
    }),
    'pagamentos',
    {}
  );
  const [f1, f2] = plan.faixas;
  assert.equal(f1.tasks[0].model, 'claude-opus-5');
  assert.equal(f1.tasks[0].esforcoCli, 'high');
  assert.equal(f2.tasks[0].model, 'claude-sonnet-5'); // config default
  assert.equal(f2.tasks[0].esforcoCli, 'medium'); // fallback
  assert.ok(plan.avisos.some((a) => a.includes('turbo')));
});

test('feature without tasks.md or nonexistent is a friendly error', () => {
  const semTasks = { ...projeto({ tasks: [] }) };
  semTasks.features[0].tasks = null;
  assert.match(montarPlano(semTasks, 'pagamentos', {}).erro, /has no tasks/);
  assert.match(montarPlano(projeto({ tasks: [t('T-001')] }), 'outra', {}).erro, /not found/);
});

function planPadrao(agent) {
  return montarPlano(
    projeto({
      tasks: [
        t('T-001', { files: ['src/a.js'], refs: ['AC-001'], line: 1 }),
        t('T-002', { files: ['src/b.js'], line: 5, esforco: 'alto' }),
        t('T-003', { line: 9 }),
      ],
      specStories: [{ id: 'US-001', acs: [{ id: 'AC-001', title: 'Payment created' }] }],
    }),
    'pagamentos',
    { agent, enginePath: '/tmp/repo-x/bin/onp-spec.js', now: new Date('2026-07-28T12:00:00Z') }
  );
}

test('md (claude): lanes, branch management, per-minute summary, no button', () => {
  const md = renderPlanoMd(planPadrao('claude'));
  assert.match(md, /## Lanes and waves/);
  assert.match(md, /spec\/pagamentos-faixa-1/);
  assert.match(md, /1 task = 1 commit/);
  assert.match(md, /executar-tarefas\.sh/);
  // the choice (which ones to parallelize, or one after another) is the user's
  assert.match(md, /onp-spec plano pagamentos --paralelizar T-xxx,T-yyy/);
  assert.match(md, /--sequencial/);
  // monitoring is the summary in chat/terminal — there is no more panel/button
  assert.match(md, /general progress summary/i);
  assert.match(md, /onp-spec resumo pagamentos/);
  assert.doesNotMatch(md, /painel/);
  assert.doesNotMatch(md, /<button/);
  assert.match(md, /audit --ci/);
});

test('--paralelizar: only the chosen ones join the lanes; the rest become sequential with a reason', () => {
  const plan = montarPlano(
    projeto({
      tasks: [
        t('T-001', { files: ['src/a.js'], line: 1 }),
        t('T-002', { files: ['src/b.js'], line: 5 }),
        t('T-003', { files: ['src/c.js'], line: 9 }),
        t('T-004', { line: 13 }),
      ],
    }),
    'pagamentos',
    { agent: 'claude', paralelizar: ['T-001', 'T-003'], enginePath: '/tmp/repo-x/bin/onp-spec.js' }
  );
  assert.ok(!plan.erro, plan.erro);
  assert.equal(plan.modo, 'paralelo');
  assert.deepEqual(plan.faixas.map((fx) => fx.tasks.map((x) => x.id)), [['T-001'], ['T-003']]);
  assert.deepEqual(plan.sequenciais.map((x) => x.id), ['T-002', 'T-004'], 'outside the selection runs at the end, in order');
  assert.match(plan.sequenciais[0].motivoSeq, /outside the user's selection/);
  assert.match(plan.sequenciais[1].motivoSeq, /unknown footprint/);
  // being outside the selection is the user's decision, not a fallback — no warning
  assert.ok(!plan.avisos.some((a) => a.includes('T-002')));
  assert.deepEqual(plan.paralelizar, ['T-001', 'T-003']);
});

test('--paralelizar: chosen tasks sharing a file land in the SAME lane', () => {
  const plan = montarPlano(
    projeto({
      tasks: [
        t('T-001', { files: ['src/a.js'], line: 1 }),
        t('T-002', { files: ['src/a.js', 'src/c.js'], line: 5 }),
        t('T-003', { files: ['src/b.js'], line: 9 }),
      ],
    }),
    'pagamentos',
    { paralelizar: ['T-001', 'T-002'] }
  );
  assert.equal(plan.faixas.length, 1, 'file conflict never becomes parallelism, not even with a selection');
  assert.deepEqual(plan.faixas[0].tasks.map((x) => x.id), ['T-001', 'T-002']);
  assert.deepEqual(plan.sequenciais.map((x) => x.id), ['T-003']);
});

test('--paralelizar: unknown task or empty selection is a friendly error', () => {
  const proj = () => projeto({ tasks: [t('T-001', { files: ['a'] }), t('T-002', { files: ['b'], status: 'done' })] });
  assert.match(
    montarPlano(proj(), 'pagamentos', { paralelizar: ['T-999'] }).erro,
    /T-999/,
    'unknown id appears in the error'
  );
  assert.match(
    montarPlano(proj(), 'pagamentos', { paralelizar: ['T-002'] }).erro,
    /not pending/,
    'done task is not parallelizable'
  );
  assert.match(montarPlano(proj(), 'pagamentos', { paralelizar: [] }).erro, /--sequencial/);
});

test('--paralelizar appears in the artifacts: md (selection + regenerate), json and sh', () => {
  const plan = montarPlano(
    projeto({
      tasks: [t('T-001', { files: ['src/a.js'], line: 1 }), t('T-002', { files: ['src/b.js'], line: 5 })],
    }),
    'pagamentos',
    { agent: 'claude', paralelizar: ['T-001'], enginePath: '/tmp/repo-x/bin/onp-spec.js' }
  );
  const md = renderPlanoMd(plan);
  assert.match(md, /user's selection.*T-001/);
  assert.match(md, /Regenerate: `onp-spec plano pagamentos --paralelizar T-001`/);
  assert.match(md, /outside the user's selection/);
  const dados = JSON.parse(renderPlanoJson(plan));
  assert.deepEqual(dados.paralelizar, ['T-001']);
  const sh = renderPlanoSh(plan);
  assert.match(sh, /sequential T-002 \(outside the user's selection\)/);
});

test('montarPlano --sequencial: no lanes, everything one after another in the tasks.md order', () => {
  const plan = montarPlano(
    projeto({
      tasks: [
        t('T-002', { files: ['src/b.js'], line: 5 }),
        t('T-001', { files: ['src/a.js'], line: 1 }),
        t('T-003', { line: 9 }),
      ],
    }),
    'pagamentos',
    { agent: 'claude', sequencial: true, enginePath: '/tmp/repo-x/bin/onp-spec.js' }
  );
  assert.equal(plan.modo, 'sequencial');
  assert.equal(plan.faixas.length, 0);
  assert.equal(plan.ondas.length, 0);
  assert.deepEqual(plan.sequenciais.map((x) => x.id), ['T-001', 'T-002', 'T-003'], 'tasks.md order');
  // no "unknown footprint" warning: sequential is a choice, not a fallback
  assert.ok(!plan.avisos.some((a) => a.includes('unknown footprint')));
});

test('md/sh/html in sequential mode: no worktrees, explicit order, same gate', () => {
  const proj = projeto({
    tasks: [t('T-001', { files: ['src/a.js'], line: 1 }), t('T-002', { files: ['src/b.js'], line: 5 })],
  });
  const plan = montarPlano(proj, 'pagamentos', { agent: 'claude', sequencial: true, enginePath: '/tmp/repo-x/bin/onp-spec.js' });

  const md = renderPlanoMd(plan);
  assert.match(md, /SEQUENTIAL mode \(user's choice\)/);
  assert.match(md, /## Execution order \(one task after another\)/);
  assert.doesNotMatch(md, /## Lanes and waves/);
  assert.match(md, /no worktrees and no parallelism/);
  assert.doesNotMatch(md, /git worktree|1 lane = 1 worktree/);
  assert.match(md, /audit --ci/);

  const sh = renderPlanoSh(plan);
  assert.match(sh, /executar_seq_T_001/);
  assert.match(sh, /executar_seq_T_002/);
  assert.doesNotMatch(sh, /executar_faixa_/);
  assert.match(sh, /rodar_gate/);

  const html = renderPlanoHtml(plan);
  assert.match(html, /mode <b>sequential<\/b> \(user's choice\)/);
  assert.match(html, /Execution order/);

  const dados = JSON.parse(renderPlanoJson(plan));
  assert.equal(dados.modo, 'sequencial');
  assert.deepEqual(dados.faixas, []);
  assert.equal(dados.sequenciais.length, 2);
});

test('md (antigravity, sequential): prompts in order, no worktrees, agent summary', () => {
  const proj = projeto({
    tasks: [t('T-001', { files: ['src/a.js'], line: 1 }), t('T-002', { files: ['src/b.js'], line: 5 })],
  });
  const plan = montarPlano(proj, 'pagamentos', { agent: 'antigravity', sequencial: true, enginePath: '/tmp/repo-x/bin/onp-spec.js' });
  const md = renderPlanoMd(plan);
  assert.match(md, /Sequential on Antigravity/);
  assert.match(md, /Prompt — T-001/);
  assert.match(md, /Prompt — T-002/);
  assert.doesNotMatch(md, /git worktree add/);
  assert.match(md, /resumo pagamentos --gravar --origem ai --texto/);
  assert.doesNotMatch(md, /claude -p/);
});

test('md (antigravity): worktrees, prompt per lane, no claude CLI', () => {
  const md = renderPlanoMd(planPadrao('antigravity'));
  assert.match(md, /git worktree add \.\.\/onp-worktrees\/repo-x-pagamentos-faixa-1/);
  assert.match(md, /Prompt — faixa-1/);
  assert.match(md, /NEVER weaken, skip \(skip\/todo\) or delete a test/);
  assert.match(md, /node bin\/onp-spec\.js tarefa pagamentos T-001 done/);
  assert.doesNotMatch(md, /claude -p/, 'Antigravity plan cannot depend on the Claude CLI');
});

// ── codex: same artifacts as claude, executor via codex exec ───────────────

test('effort for codex: max becomes xhigh (codex has no "max"); claude keeps it', () => {
  assert.equal(esforcoParaAgente('max', 'codex'), 'xhigh');
  assert.equal(esforcoParaAgente('max', 'claude'), 'max');
  assert.equal(esforcoParaAgente('high', 'codex'), 'high');
  assert.equal(esforcoParaAgente('max', 'cursor'), 'max', 'in cursor the effort is informative — passes intact');
  assert.equal(usaExecutorSh('codex'), true);
  assert.equal(usaExecutorSh('claude'), true);
  assert.equal(usaExecutorSh('cursor'), true);
  assert.equal(usaExecutorSh('antigravity'), false);
});

test('codex: claude-* model from config becomes gpt-5.6-terra; explicit claude Model: warns', () => {
  const plan = montarPlano(
    projeto({
      tasks: [
        t('T-001', { files: ['a'], line: 1 }), // inherits the config default (claude-sonnet-5)
        t('T-002', { files: ['b'], line: 5, model: 'claude-opus-5', esforco: 'max' }),
        t('T-003', { files: ['c'], line: 9, model: 'gpt-5.6-sol', esforco: 'alto' }),
      ],
    }),
    'pagamentos',
    { agent: 'codex', enginePath: '/tmp/repo-x/bin/onp-spec.js' }
  );
  assert.ok(!plan.erro, plan.erro);
  assert.equal(plan.agent, 'codex');
  const [f1, f2, f3] = plan.faixas;
  assert.equal(f1.tasks[0].model, 'gpt-5.6-terra', 'claude-* config default does not serve codex');
  assert.equal(f2.tasks[0].model, 'gpt-5.6-terra', 'explicit claude-* Model: is also swapped');
  assert.ok(plan.avisos.some((a) => a.includes('T-002') && a.includes('claude-opus-5')), 'explicit swap warns');
  assert.equal(f2.tasks[0].esforcoCli, 'xhigh', 'max becomes xhigh under codex');
  assert.equal(f3.tasks[0].model, 'gpt-5.6-sol', 'codex model passes intact');
  assert.equal(f3.tasks[0].esforcoCli, 'high');
});

test('--modelo/--esforco: the user locks the cost of the whole plan (beats tasks.md and config)', () => {
  const plan = montarPlano(
    projeto({
      tasks: [
        t('T-001', { files: ['a'], line: 1, model: 'gpt-5.6-sol', esforco: 'xalto' }), // per-task loses to the user's choice
        t('T-002', { files: ['b'], line: 5 }),
        t('T-003', { line: 9 }),
      ],
    }),
    'pagamentos',
    { agent: 'codex', modelo: 'gpt-5.6-luna', esforco: 'baixo', enginePath: '/tmp/repo-x/bin/onp-spec.js' }
  );
  assert.ok(!plan.erro, plan.erro);
  assert.equal(plan.modeloForcado, 'gpt-5.6-luna');
  assert.equal(plan.esforcoForcado, 'low');
  for (const tarefa of [...plan.faixas.flatMap((fx) => fx.tasks), ...plan.sequenciais]) {
    assert.equal(tarefa.model, 'gpt-5.6-luna', `${tarefa.id} should use the locked model`);
    assert.equal(tarefa.esforcoCli, 'low', `${tarefa.id} should use the locked effort`);
  }
  // appears in the artifacts: md (summary + regenerate), json and sh
  const md = renderPlanoMd(plan);
  assert.match(md, /cost locked by the user.*gpt-5\.6-luna.*low/);
  assert.match(md, /Regenerate: `onp-spec plano pagamentos --modelo gpt-5.6-luna --esforco low`/);
  const dados = JSON.parse(renderPlanoJson(plan));
  assert.equal(dados.modeloForcado, 'gpt-5.6-luna');
  assert.equal(dados.esforcoForcado, 'low');
  const sh = renderPlanoSh(plan);
  assert.match(sh, /rodar_tarefa 'faixa-1' 'T-001' '[\s\S]*?' 'gpt-5.6-luna' low/);
});

test('--modelo/--esforco: invalid values are a friendly error, never silent execution', () => {
  const proj = () => projeto({ tasks: [t('T-001', { files: ['a'] })] });
  assert.match(
    montarPlano(proj(), 'pagamentos', { agent: 'codex', esforco: 'turbo' }).erro,
    /--esforco "turbo" unknown/
  );
  assert.match(
    montarPlano(proj(), 'pagamentos', { agent: 'codex', modelo: 'claude-opus-5' }).erro,
    /is a Claude model/,
    'forcing a claude model in a codex plan is an error, not a silent swap'
  );
  // on claude, --modelo claude-* is legitimate
  const claude = montarPlano(proj(), 'pagamentos', { agent: 'claude', modelo: 'claude-opus-5' });
  assert.ok(!claude.erro, claude.erro);
  assert.equal(claude.faixas[0].tasks[0].model, 'claude-opus-5');
});

test('md (codex): codex exec section, sandbox, cost confirmation — no claude -p', () => {
  const md = renderPlanoMd(planPadrao('codex'));
  assert.match(md, /Execution — Codex headless \(codex exec\)/);
  assert.match(md, /executar-tarefas\.sh/);
  assert.match(md, /`codex exec`/);
  assert.match(md, /model_reasoning_effort/);
  assert.match(md, /sandbox `workspace-write`/);
  assert.match(md, /general progress summary/i);
  assert.match(md, /onp-spec resumo pagamentos/);
  assert.match(md, /audit --ci/);
  assert.doesNotMatch(md, /claude -p/, 'codex plan cannot depend on the Claude CLI');
  // cost confirmation is part of the artifact — the agent does not run without it
  assert.match(md, /Cost confirmation — before executing/);
  assert.match(md, /--modelo gpt-5\.6-luna --esforco baixo/);
  assert.match(md, /onp-spec tarefa pagamentos T-xxx --modelo/);
  // on claude, none of that: behavior untouched
  assert.doesNotMatch(renderPlanoMd(planPadrao('claude')), /Cost confirmation/);
});

test('sh (codex): codex exec with --model and model_reasoning_effort per task, --json, sandbox and --add-dir', () => {
  const sh = renderPlanoSh(planPadrao('codex'));
  assert.match(sh, /^#!\/usr\/bin\/env bash/);
  assert.match(sh, /codex exec "\$3" --model "\$4" -c model_reasoning_effort="\$5" "\$\{STREAM_FLAGS\[@\]}" "\$\{CODEX_FLAGS\[@\]}" --add-dir "\$TOPLEVEL"/);
  assert.match(sh, /STREAM_FLAGS=\(--json\)/);
  assert.match(sh, /CODEX_FLAGS=\(--sandbox 'workspace-write'\)/);
  assert.match(sh, /command -v codex/);
  assert.doesNotMatch(sh, /command -v claude/, 'codex executor does not require the Claude CLI');
  assert.doesNotMatch(sh, /claude -p/, 'no claude invocation in the codex executor');
  // prompts per task with model/effort resolved (config default → terra)
  assert.match(sh, /rodar_tarefa 'faixa-1' 'T-001' '[\s\S]*?' 'gpt-5.6-terra' medium/);
  assert.match(sh, /rodar_tarefa 'faixa-2' 'T-002' '[\s\S]*?' 'gpt-5.6-terra' high/);
  // per-minute summary: codex exec read-only, cheap model of the family
  assert.match(sh, /RESUMO_MODEL='gpt-5.6-luna'/);
  assert.match(sh, /codex exec "You narrate[\s\S]*?--model "\$RESUMO_MODEL" --sandbox read-only --ephemeral/);
  // identical infrastructure to claude: worktrees, merge, ledger, gate, dispatcher
  assert.match(sh, /git worktree add "\$3" -b/);
  assert.match(sh, /mesclar_faixa 'faixa-1'/);
  assert.match(sh, /executar_seq_T_003/);
  assert.match(sh, /evento\(\) \{ node "\$ENGINE" evento --run "\$RUN_ID"/);
  assert.match(sh, /--faixa\) MODO="faixa"; ALVO="\$\{2:-}"; shift ;;/);
  assert.match(sh, /--sem-gate\) COM_GATE=0/);
  assert.match(sh, /rodar_gate/);
  assert.match(sh, /audit --ci/);
  assert.match(sh, /📣 summary/);
});

test('sh (codex): --sem-gate NEVER announces alignment (parity with claude)', () => {
  const sh = renderPlanoSh(planPadrao('codex'));
  const semGate = sh.slice(sh.indexOf('if [ "$COM_GATE" -eq 0 ]'), sh.indexOf('rodar_gate\n  local audit'));
  assert.match(semGate, /NOT proof of anything/);
  assert.doesNotMatch(semGate, /audit exit 0/);
  assert.match(semGate, /evento --tipo end --exit 1/);
});

// ── opencode: same artifacts, executor via opencode run ────────────────────

test('effort and executor for opencode; bare claude model gets provider prefix', () => {
  assert.equal(usaExecutorSh('opencode'), true);
  assert.equal(esforcoParaAgente('max', 'opencode'), 'max');
  const plan = montarPlano(
    projeto({
      tasks: [
        t('T-001', { files: ['a'], line: 1 }), // config default (claude-sonnet-5) → anthropic/claude-sonnet-5
        t('T-002', { files: ['b'], line: 5, model: 'anthropic/claude-opus-5' }), // already qualified
        t('T-003', { files: ['c'], line: 9, model: 'openai/gpt-5.6-sol' }),
      ],
    }),
    'pagamentos',
    { agent: 'opencode', enginePath: '/tmp/repo-x/bin/onp-spec.js' }
  );
  assert.ok(!plan.erro, plan.erro);
  assert.equal(plan.agent, 'opencode');
  const [f1, f2, f3] = plan.faixas;
  assert.equal(f1.tasks[0].model, 'anthropic/claude-sonnet-5', 'bare claude config default gets provider prefix');
  assert.equal(f2.tasks[0].model, 'anthropic/claude-opus-5', 'qualified model passes intact');
  assert.equal(f3.tasks[0].model, 'openai/gpt-5.6-sol', 'other providers pass intact');
  // bare non-claude slug for opencode is rejected (provider/model required)
  const ruim = montarPlano(
    projeto({ tasks: [t('T-001', { files: ['a'], line: 1 })] }),
    'pagamentos',
    { agent: 'opencode', modelo: 'gpt-5.6-terra', enginePath: '/tmp/repo-x/bin/onp-spec.js' }
  );
  assert.match(ruim.erro, /provider\/model/);
});

test('md (opencode): opencode run section, model/effort confirmation — no claude -p', () => {
  const md = renderPlanoMd(planPadrao('opencode'));
  assert.match(md, /Execution — opencode headless \(opencode run\)/);
  assert.match(md, /executar-tarefas\.sh/);
  assert.match(md, /`opencode run`/);
  assert.match(md, /--variant/);
  assert.match(md, /general progress summary/i);
  assert.match(md, /onp-spec resumo pagamentos/);
  assert.match(md, /audit --ci/);
  assert.doesNotMatch(md, /claude -p/, 'opencode plan cannot depend on the Claude CLI');
  assert.doesNotMatch(md, /codex exec/, 'opencode plan cannot depend on the Codex CLI');
  assert.match(md, /Cost confirmation — before executing/);
  assert.match(md, /openai\/gpt-5\.6-luna --esforco baixo/);
});

test('sh (opencode): opencode run with --model and --variant per task, --format json and --auto', () => {
  const sh = renderPlanoSh(planPadrao('opencode'));
  assert.match(sh, /^#!\/usr\/bin\/env bash/);
  assert.match(sh, /opencode run "\$3" --model "\$4" --variant "\$5" "\$\{STREAM_FLAGS\[@\]}" "\$\{OPENCODE_FLAGS\[@\]}"/);
  assert.match(sh, /STREAM_FLAGS=\(--format json\)/);
  assert.match(sh, /OPENCODE_FLAGS=\(--auto\)/);
  assert.match(sh, /command -v opencode/);
  assert.doesNotMatch(sh, /command -v claude/, 'opencode executor does not require the Claude CLI');
  assert.doesNotMatch(sh, /claude -p/, 'no claude invocation in the opencode executor');
  // config default model resolves to anthropic/claude-sonnet-5
  assert.match(sh, /rodar_tarefa 'faixa-1' 'T-001' '[\s\S]*?' 'anthropic\/claude-sonnet-5' medium/);
  assert.match(sh, /rodar_tarefa 'faixa-2' 'T-002' '[\s\S]*?' 'anthropic\/claude-sonnet-5' high/);
  // summary: opencode run without --auto (read-only), cheap openai-qualified model
  assert.match(sh, /RESUMO_MODEL='openai\/gpt-5\.6-luna'/);
  assert.match(sh, /opencode run "You narrate[\s\S]*?--model "\$RESUMO_MODEL" --format default/);
  // identical infrastructure: worktrees, merge, ledger, gate, dispatcher
  assert.match(sh, /git worktree add "\$3" -b/);
  assert.match(sh, /mesclar_faixa 'faixa-1'/);
  assert.match(sh, /executar_seq_T_003/);
  assert.match(sh, /audit --ci/);
});

test('sh (opencode): --sem-gate NEVER announces alignment (parity with the rest)', () => {
  const sh = renderPlanoSh(planPadrao('opencode'));
  const semGate = sh.slice(sh.indexOf('if [ "$COM_GATE" -eq 0 ]'), sh.indexOf('rodar_gate\n  local audit'));
  assert.match(semGate, /NOT proof of anything/);
});

test('claude is untouched by the new agents (no regression)', () => {
  const sh = renderPlanoSh(planPadrao('claude'));
  assert.match(sh, /command -v claude/);
  assert.match(sh, /claude -p "\$3" --model "\$4" --effort "\$5"/);
  assert.match(sh, /CLAUDE_FLAGS=\(--permission-mode/);
  assert.doesNotMatch(sh, /opencode run/, 'claude plan stays claude-only');
  assert.doesNotMatch(sh, /codex exec/, 'claude plan stays claude-only');
});

test('html (codex): visual cites codex exec, no button and no claude', () => {
  const plan = montarPlano(
    projeto({ tasks: [t('T-001', { files: ['src/a.js'] })] }),
    'pagamentos',
    { agent: 'codex' }
  );
  const html = renderPlanoHtml(plan);
  assert.doesNotMatch(html, /<button/);
  assert.match(html, /Ask the agent \(Codex\)/);
  assert.match(html, /codex exec/);
  assert.doesNotMatch(html, /claude -p/);
});

test('md/sh (codex, sequential): explicit order, no worktrees, same gate', () => {
  const proj = projeto({
    tasks: [t('T-001', { files: ['src/a.js'], line: 1 }), t('T-002', { files: ['src/b.js'], line: 5 })],
  });
  const plan = montarPlano(proj, 'pagamentos', { agent: 'codex', sequencial: true, enginePath: '/tmp/repo-x/bin/onp-spec.js' });
  const md = renderPlanoMd(plan);
  assert.match(md, /SEQUENTIAL mode \(user's choice\)/);
  assert.match(md, /Execution — Codex headless/);
  assert.doesNotMatch(md, /## Lanes and waves/);
  const sh = renderPlanoSh(plan);
  assert.match(sh, /executar_seq_T_001/);
  assert.doesNotMatch(sh, /executar_faixa_/);
  assert.match(sh, /codex exec "\$3"/);
  const dados = JSON.parse(renderPlanoJson(plan));
  assert.equal(dados.agent, 'codex');
  assert.equal(dados.modo, 'sequencial');
});

// ── cursor: same artifacts as claude, executor via the Cursor CLI (agent) ──

test('cursor: claude-* models are VALID slugs — nothing is swapped, not even a warning', () => {
  const plan = montarPlano(
    projeto({
      tasks: [
        t('T-001', { files: ['a'], line: 1 }), // inherits the config default (claude-sonnet-5)
        t('T-002', { files: ['b'], line: 5, model: 'claude-opus-5', esforco: 'max' }),
        t('T-003', { files: ['c'], line: 9, model: 'composer', esforco: 'alto' }),
      ],
    }),
    'pagamentos',
    { agent: 'cursor', enginePath: '/tmp/repo-x/bin/onp-spec.js' }
  );
  assert.ok(!plan.erro, plan.erro);
  assert.equal(plan.agent, 'cursor');
  const [f1, f2, f3] = plan.faixas;
  assert.equal(f1.tasks[0].model, 'claude-sonnet-5', 'Cursor serves claude models — default passes intact');
  assert.equal(f2.tasks[0].model, 'claude-opus-5', 'explicit claude-* Model: is respected in cursor');
  assert.equal(f3.tasks[0].model, 'composer', 'Cursor house model passes intact');
  assert.ok(!plan.avisos.some((a) => a.includes('claude-opus-5')), 'no swap warning — there was no swap');
  // --modelo claude-* is also legitimate in cursor (in codex it would be an error)
  const forcado = montarPlano(
    projeto({ tasks: [t('T-001', { files: ['a'] })] }),
    'pagamentos',
    { agent: 'cursor', modelo: 'claude-opus-5' }
  );
  assert.ok(!forcado.erro, forcado.erro);
  assert.equal(forcado.faixas[0].tasks[0].model, 'claude-opus-5');
});

test('md (cursor): Cursor CLI section, --force, cost confirmation and effort-in-slug — no claude -p', () => {
  const md = renderPlanoMd(planPadrao('cursor'));
  assert.match(md, /Execution — Cursor headless \(agent CLI\)/);
  assert.match(md, /executar-tarefas\.sh/);
  assert.match(md, /`agent -p` \(Cursor CLI\)/);
  assert.match(md, /--force/);
  assert.match(md, /general progress summary/i);
  assert.match(md, /onp-spec resumo pagamentos/);
  assert.match(md, /audit --ci/);
  assert.doesNotMatch(md, /claude -p/, 'cursor plan cannot depend on the Claude CLI');
  assert.doesNotMatch(md, /codex exec/, 'nor on the Codex CLI');
  // cost confirmation is part of the artifact — the agent does not run without it
  assert.match(md, /Cost confirmation — before executing/);
  assert.match(md, /--modelo composer/);
  assert.match(md, /onp-spec tarefa pagamentos T-xxx --modelo/);
  // honesty: the Cursor CLI has no effort flag — the slug decides
  assert.match(md, /Effort in Cursor/);
  assert.match(md, /gpt-5\.6-terra-high/);
  assert.match(md, /does NOT become a flag/);
});

test('sh (cursor): agent -p with --model per task, stream-json, --force and cursor-agent fallback', () => {
  const sh = renderPlanoSh(planPadrao('cursor'));
  assert.match(sh, /^#!\/usr\/bin\/env bash/);
  // current binary `agent`, with fallback to the legacy name `cursor-agent`
  assert.match(sh, /CURSOR_BIN=\$\(command -v agent \|\| command -v cursor-agent\)/);
  assert.match(sh, /curl https:\/\/cursor\.com\/install -fsS \| bash/);
  // invocation per task: model yes, effort NO (there is no flag in the CLI)
  assert.match(sh, /"\$CURSOR_BIN" -p "\$3" --model "\$4" "\$\{STREAM_FLAGS\[@\]}" "\$\{CURSOR_FLAGS\[@\]}"/);
  assert.match(sh, /STREAM_FLAGS=\(--output-format stream-json\)/);
  assert.match(sh, /CURSOR_FLAGS=\(--force\)/);
  assert.doesNotMatch(sh, /--effort/, 'the Cursor CLI has no effort flag');
  assert.doesNotMatch(sh, /model_reasoning_effort/, 'nor the codex effort config');
  assert.doesNotMatch(sh, /command -v claude/, 'cursor executor does not require the Claude CLI');
  assert.doesNotMatch(sh, /claude -p/, 'no claude invocation in the cursor executor');
  assert.doesNotMatch(sh, /codex exec/, 'no codex invocation in the cursor executor');
  // prompts per task with resolved model (claude-sonnet-5 default is valid in Cursor)
  assert.match(sh, /rodar_tarefa 'faixa-1' 'T-001' '[\s\S]*?' 'claude-sonnet-5' medium/);
  assert.match(sh, /rodar_tarefa 'faixa-2' 'T-002' '[\s\S]*?' 'claude-sonnet-5' high/);
  // per-minute summary: agent -p WITHOUT --force (read-only), house model
  assert.match(sh, /RESUMO_MODEL='composer'/);
  assert.match(sh, /"\$CURSOR_BIN" -p "You narrate[\s\S]*?--model "\$RESUMO_MODEL"/);
  const resumoIdx = sh.indexOf('"$CURSOR_BIN" -p "You narrate');
  const resumoFim = sh.indexOf('2>/dev/null)', resumoIdx);
  assert.ok(!sh.slice(resumoIdx, resumoFim).includes('--force'), 'per-minute summary is read-only (no --force)');
  // identical infrastructure to claude: worktrees, merge, ledger, gate, dispatcher
  assert.match(sh, /git worktree add "\$3" -b/);
  assert.match(sh, /mesclar_faixa 'faixa-1'/);
  assert.match(sh, /executar_seq_T_003/);
  assert.match(sh, /evento\(\) \{ node "\$ENGINE" evento --run "\$RUN_ID"/);
  assert.match(sh, /--faixa\) MODO="faixa"; ALVO="\$\{2:-}"; shift ;;/);
  assert.match(sh, /--sem-gate\) COM_GATE=0/);
  assert.match(sh, /rodar_gate/);
  assert.match(sh, /audit --ci/);
  assert.match(sh, /📣 summary/);
});

test('sh (cursor): --sem-gate NEVER announces alignment (parity with claude)', () => {
  const sh = renderPlanoSh(planPadrao('cursor'));
  const semGate = sh.slice(sh.indexOf('if [ "$COM_GATE" -eq 0 ]'), sh.indexOf('rodar_gate\n  local audit'));
  assert.match(semGate, /NOT proof of anything/);
  assert.doesNotMatch(semGate, /audit exit 0/);
  assert.match(semGate, /evento --tipo end --exit 1/);
});

test('html (cursor): visual cites the Cursor CLI, no button and no claude', () => {
  const plan = montarPlano(
    projeto({ tasks: [t('T-001', { files: ['src/a.js'] })] }),
    'pagamentos',
    { agent: 'cursor' }
  );
  const html = renderPlanoHtml(plan);
  assert.doesNotMatch(html, /<button/);
  assert.match(html, /Ask the agent \(Cursor\)/);
  assert.match(html, /agent -p/);
  assert.doesNotMatch(html, /claude -p/);
  assert.doesNotMatch(html, /codex exec/);
});

test('md/sh (cursor, sequential): explicit order, no worktrees, same gate', () => {
  const proj = projeto({
    tasks: [t('T-001', { files: ['src/a.js'], line: 1 }), t('T-002', { files: ['src/b.js'], line: 5 })],
  });
  const plan = montarPlano(proj, 'pagamentos', { agent: 'cursor', sequencial: true, enginePath: '/tmp/repo-x/bin/onp-spec.js' });
  const md = renderPlanoMd(plan);
  assert.match(md, /SEQUENTIAL mode \(user's choice\)/);
  assert.match(md, /Execution — Cursor headless/);
  assert.doesNotMatch(md, /## Lanes and waves/);
  const sh = renderPlanoSh(plan);
  assert.match(sh, /executar_seq_T_001/);
  assert.doesNotMatch(sh, /executar_faixa_/);
  assert.match(sh, /"\$CURSOR_BIN" -p "\$3"/);
  const dados = JSON.parse(renderPlanoJson(plan));
  assert.equal(dados.agent, 'cursor');
  assert.equal(dados.modo, 'sequencial');
});

test('sh: claude -p with model/effort per task, stream-json, worktrees and merge', () => {
  const sh = renderPlanoSh(planPadrao('claude'));
  assert.match(sh, /^#!\/usr\/bin\/env bash/);
  assert.match(sh, /claude -p "\$3" --model "\$4" --effort "\$5" "\$\{STREAM_FLAGS\[@\]}"/);
  assert.match(sh, /STREAM_FLAGS=\(--output-format stream-json --verbose\)/);
  // the prompt goes inline (multiline) between the task and the model/effort
  assert.match(sh, /rodar_tarefa 'faixa-1' 'T-001' '[\s\S]*?' 'claude-sonnet-5' medium/);
  assert.match(sh, /rodar_tarefa 'faixa-2' 'T-002' '[\s\S]*?' 'claude-sonnet-5' high/); // high effort from the task
  assert.match(sh, /--permission-mode acceptEdits/);
  assert.match(sh, /Bash\(node:\*\)/); // allowedTools derived from testCommand
  assert.match(sh, /git worktree add "\$3" -b/);
  assert.match(sh, /mesclar_faixa 'faixa-1'/);
  assert.match(sh, /marcar_concluidas T-001/); // T-003 has no Files: → sequential
  assert.match(sh, /audit --ci/);
  assert.match(sh, /executar_seq_T_003/); // task without files gets its own function
  // events for the global ledger (the live panel reads them)
  assert.match(sh, /evento\(\) \{ node "\$ENGINE" evento --run "\$RUN_ID"/);
  assert.match(sh, /evento --tipo faixa --faixa 'faixa-1' --estado running/);
  assert.match(sh, /evento --tipo gate --etapa audit --exit "\$AUDIT"/);
  assert.match(sh, /RUN_ID='repo-x-pagamentos/);
});

test('sh: dispatcher allows re-running ONE lane, ONE sequential, or only the gate', () => {
  const sh = renderPlanoSh(planPadrao('claude'));
  // one function per lane and per sequential = isolatable target
  assert.match(sh, /executar_faixa_1\(\) \{/);
  assert.match(sh, /executar_faixa_2\(\) \{/);
  assert.match(sh, /executar_seq_T_003\(\) \{/);
  // argument parsing
  assert.match(sh, /--faixa\) MODO="faixa"; ALVO="\$\{2:-}"; shift ;;/);
  assert.match(sh, /--seq\) MODO="seq"/);
  assert.match(sh, /--gate\) MODO="gate"/);
  assert.match(sh, /--listar\) MODO="listar"/);
  assert.match(sh, /--sem-gate\) COM_GATE=0/);
  // dispatch by target (with the periodic summary on), unknown lane blocked
  assert.match(sh, /faixa-1\) evento --tipo start --escopo "faixa:faixa-1"; iniciar_resumos; executar_faixa_1/);
  assert.match(sh, /falhar "unknown lane/);
  assert.match(sh, /falhar "unknown sequential task/);
  // previous attempt's worktree is cleaned before recreating
  assert.match(sh, /git worktree remove --force "\$3"/);
  assert.match(sh, /git branch -D "\$2"/);
  assert.match(sh, /tentativa\(\)/);
  // the re-run hint appears when something fails
  assert.match(sh, /re-run only it: bash .*--faixa \$1/);
});

test('sh: general progress summary every minute (AI with engine fallback)', () => {
  const sh = renderPlanoSh(planPadrao('claude'));
  assert.match(sh, /gerar_resumo\(\)/);
  assert.match(sh, /sleep 60; gerar_resumo/);
  assert.match(sh, /resumo "\$FEATURE" --contexto/);
  assert.match(sh, /--gravar --origem ai --texto "\$ia"/);
  assert.match(sh, /RESUMO_MODEL='claude-haiku-4-5'/);
  // without AI available, the engine's summary takes its place (never silence)
  assert.match(sh, /resumo "\$FEATURE" --gravar >\/dev\/null/);
  // the text shows in the terminal, for whoever follows there
  assert.match(sh, /📣 summary/);
  // on exit: kills the loop AND the child sleep (the pipe is not stuck) and records the end
  assert.match(sh, /pkill -P "\$RESUMO_PID"/);
  assert.match(sh, /trap 'parar_resumos; node "\$ENGINE" resumo "\$FEATURE" --gravar/);
});

test('sh: --sem-gate NEVER announces alignment (there is no proof without audit)', () => {
  const sh = renderPlanoSh(planPadrao('claude'));
  const semGate = sh.slice(sh.indexOf('if [ "$COM_GATE" -eq 0 ]'), sh.indexOf('rodar_gate\n  local audit'));
  assert.match(semGate, /NOT proof of anything/);
  assert.doesNotMatch(semGate, /audit exit 0/, 'without running the audit, never say it exited 0');
  assert.match(semGate, /evento --tipo end --exit 1/, 'the ledger records that there was no verdict');
  // the alignment phrase only exists on the path that runs the gate
  const comGate = sh.slice(sh.indexOf('rodar_gate\n  local audit'));
  assert.match(comGate, /audit exit 0/);
});

test('plano.json: machine structure for the panel and other tools', async () => {
  const { renderPlanoJson } = await import('../src/core/plano.js');
  const dados = JSON.parse(renderPlanoJson(planPadrao('claude')));
  assert.equal(dados.feature, 'pagamentos');
  assert.deepEqual(dados.ondas, [['faixa-1', 'faixa-2']]);
  assert.equal(dados.faixas[0].tarefas[0].id, 'T-001');
  assert.equal(dados.faixas[0].tarefas[0].esforco, 'medium');
  assert.equal(dados.sequenciais[0].id, 'T-003');
  assert.match(dados.logsDir, /onp-worktrees\/repo-x-pagamentos-logs/);
});

test('html: visual without button, visible command, theme and hostile content escaping', () => {
  const proj = projeto({
    tasks: [t('T-001', { files: ['src/a.js'] })],
  });
  proj.features[0].tasks.tasks[0].title = 'Task <script>alert(1)</script> & "quotes"';
  const plan = montarPlano(proj, 'pagamentos', { agent: 'claude' });
  const html = renderPlanoHtml(plan);
  // execution is via agent: the html has no button nor clipboard
  assert.doesNotMatch(html, /<button/);
  assert.doesNotMatch(html, /navigator\.clipboard/);
  assert.match(html, /via agent/);
  assert.match(html, /bash \.spec\/features\/pagamentos\/executar-tarefas\.sh/);
  assert.match(html, /general progress summary/i);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.ok(!html.includes('<script>alert(1)</script>'), 'title must come out escaped');
  assert.match(html, /&lt;script&gt;/);
});

test('sh: title with single quotes does not break the bash quoting', () => {
  const proj = projeto({ tasks: [t('T-001', { files: ['src/a.js'] })] });
  proj.features[0].tasks.tasks[0].title = `fluxo "d'água" & $HOME \`id\``;
  const sh = renderPlanoSh(montarPlano(proj, 'pagamentos', { agent: 'claude' }));
  // inside single quotes, the only sensitive sequence is the quote itself — escaped
  assert.match(sh, /d'\\''água/);
});
