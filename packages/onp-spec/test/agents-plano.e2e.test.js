// E2E of the multi-agent points: init --agents (claude | antigravity | invalid),
// plano generating the right artifacts per agent (sh with valid bash syntax,
// read-only html, sequential mode) and the tarefa command.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync, existsSync, statSync } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(__dirname, '..', 'bin', 'onp-spec.js');

const root = mkdtempSync(path.join(os.tmpdir(), 'onpspec-agents-'));
// ledger in its own folder: the test NEVER writes to the user's ~/.onp-spec
const homeOnp = path.join(root, '.onp-home');
after(() => rmSync(root, { recursive: true, force: true }));

function cli(...args) {
  const proc = spawnSync('node', [BIN, ...args], {
    cwd: root,
    encoding: 'utf-8',
    env: { ...process.env, ONP_SPEC_HOME: homeOnp },
  });
  return { code: proc.status, out: `${proc.stdout}\n${proc.stderr}` };
}

test('init --agents invalid fails loud (exit 2), nothing installed', () => {
  const { code, out } = cli('init', '--agents', 'copilot');
  assert.equal(code, 2, out);
  assert.match(out, /unknown --agents/);
  assert.ok(
    !existsSync(path.join(root, '.claude')) &&
      !existsSync(path.join(root, '.agents')) &&
      !existsSync(path.join(root, '.cursor'))
  );
});

test('init --agents claude installs the Claude skill in .claude/skills/', () => {
  const { code, out } = cli('init', '--agents', 'claude');
  assert.equal(code, 0, out);
  const skillMd = path.join(root, '.claude', 'skills', 'onp-spec-driven', 'SKILL.md');
  assert.ok(existsSync(skillMd));
  assert.match(readFileSync(skillMd, 'utf-8'), /agent: claude/);
});

test('init --agents antigravity installs the Antigravity skill in .agents/skills/', () => {
  const { code, out } = cli('init', '--agents', 'antigravity');
  assert.equal(code, 0, out);
  const skillMd = path.join(root, '.agents', 'skills', 'onp-spec-driven', 'SKILL.md');
  assert.ok(existsSync(skillMd));
  const conteudo = readFileSync(skillMd, 'utf-8');
  assert.match(conteudo, /agent: antigravity/);
  assert.match(conteudo, /Antigravity/);
});

test('embedded engine of a skill does NOT install another agent\'s skill as if it were the right one', () => {
  // the claude skill's embedded engine (fallback ../../..) cannot serve the
  // claude skill when antigravity is requested — it must warn and instruct
  const embarcado = path.join(root, '.claude', 'skills', 'onp-spec-driven', 'scripts', 'onp-spec.mjs');
  rmSync(path.join(root, '.agents'), { recursive: true, force: true });
  const proc = spawnSync('node', [embarcado, 'init', '--agents', 'antigravity'], {
    cwd: root,
    encoding: 'utf-8',
  });
  const out = `${proc.stdout}\n${proc.stderr}`;
  assert.equal(proc.status, 0, out);
  assert.match(out, /skill for Antigravity not found/);
  assert.ok(!existsSync(path.join(root, '.agents', 'skills', 'onp-spec-driven', 'SKILL.md')));
});

test('init --agents codex does NOT overwrite the Antigravity skill (they share .agents/skills)', () => {
  assert.equal(cli('init', '--agents', 'antigravity').code, 0);
  const { code, out } = cli('init', '--agents', 'codex');
  assert.equal(code, 2, out);
  assert.match(out, /already contains the skill for agent "antigravity"/);
  assert.match(out, /rm -rf/);
  // the Antigravity skill stayed intact
  const skillMd = path.join(root, '.agents', 'skills', 'onp-spec-driven', 'SKILL.md');
  assert.match(readFileSync(skillMd, 'utf-8'), /agent: antigravity/);
});

test('init --agents codex installs the Codex skill in .agents/skills/ (Codex\'s skills directory)', () => {
  rmSync(path.join(root, '.agents'), { recursive: true, force: true });
  const { code, out } = cli('init', '--agents', 'codex');
  assert.equal(code, 0, out);
  const skillMd = path.join(root, '.agents', 'skills', 'onp-spec-driven', 'SKILL.md');
  assert.ok(existsSync(skillMd));
  const conteudo = readFileSync(skillMd, 'utf-8');
  assert.match(conteudo, /agent: codex/);
  assert.match(conteudo, /Codex/);
  // self-sufficient: the embedded engine came along
  assert.ok(existsSync(path.join(root, '.agents', 'skills', 'onp-spec-driven', 'scripts', 'onp-spec.mjs')));
  // and running again keeps it, without complaining
  const denovo = cli('init', '--agents', 'codex');
  assert.equal(denovo.code, 0, denovo.out);
});

test('init --agents cursor installs the Cursor skill in .cursor/skills/ (Cursor\'s skills directory)', () => {
  const { code, out } = cli('init', '--agents', 'cursor');
  assert.equal(code, 0, out);
  const skillMd = path.join(root, '.cursor', 'skills', 'onp-spec-driven', 'SKILL.md');
  assert.ok(existsSync(skillMd));
  const conteudo = readFileSync(skillMd, 'utf-8');
  assert.match(conteudo, /agent: cursor/);
  assert.match(conteudo, /Cursor/);
  // Cursor requires name equal to the installed folder name
  assert.match(conteudo, /^name: onp-spec-driven$/m);
  // self-sufficient: the embedded engine came along
  assert.ok(existsSync(path.join(root, '.cursor', 'skills', 'onp-spec-driven', 'scripts', 'onp-spec.mjs')));
  // Cursor also reads .agents/skills (and .claude/.codex for compatibility):
  // with the codex skill installed there, init WARNS about the read conflict
  assert.match(out, /also has the skill for agent "codex"/);
  assert.match(out, /rm -rf \.agents\/skills\/onp-spec-driven/);
  // and running again keeps it, without error (warning is not a block — the choice is the user's)
  const denovo = cli('init', '--agents', 'cursor');
  assert.equal(denovo.code, 0, denovo.out);
  assert.match(readFileSync(path.join(root, '.agents', 'skills', 'onp-spec-driven', 'SKILL.md'), 'utf-8'), /agent: codex/);
});

const SPEC = `# Spec: Pagamentos

> feature: pagamentos
> status: em-implementacao

## Histórias

### US-001 — Cobrança do mês

Como financeiro, quero cobrança automática, para receber em dia.

#### AC-001 — Cobrança criada

- **Dado** um aluno ativo
- **Quando** o mês vira
- **Então** a cobrança aparece para o aluno

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
`;

const TASKS = `# Tasks: Pagamentos

> feature: pagamentos

## T-001 — Modelo de cobrança [pending]

- Refs: US-001, AC-001
- Files: src/models/cobranca.js

## T-002 — Envio de recibo [pending]

- Refs: AC-001
- Files: src/services/recibo.js
- Model: claude-opus-5
- Effort: alto

## T-003 — Rota de cobrança [pending]

- Refs: AC-001
- Files: src/models/cobranca.js, src/routes/cobranca.js
`;

test('plano (claude): generates md + executable sh with valid bash + read-only html', () => {
  cli('new', 'pagamentos');
  const dir = path.join(root, '.spec', 'features', 'pagamentos');
  writeFileSync(path.join(dir, 'spec.md'), SPEC);
  writeFileSync(path.join(dir, 'tasks.md'), TASKS);

  const { code, out } = cli('plano', 'pagamentos', '--agents', 'claude');
  assert.equal(code, 0, out);
  assert.match(out, /CAN RUN IN PARALLEL across 2 lane\(s\)/);
  assert.match(out, /where everything is/);
  // the choice is the user's: the output teaches the sequential route
  assert.match(out, /--sequencial/);
  // monitoring is the summary — no server/panel anymore
  assert.match(out, /general progress summary/i);
  assert.doesNotMatch(out, /painel/);

  const md = readFileSync(path.join(dir, 'plano-execucao.md'), 'utf-8');
  assert.match(md, /faixa-1/);
  assert.match(md, /T-001[\s\S]*T-003/); // same lane (shared file)

  const shPath = path.join(dir, 'executar-tarefas.sh');
  assert.ok(statSync(shPath).mode & 0o100, 'script must be executable');
  const bashN = spawnSync('bash', ['-n', shPath], { encoding: 'utf-8' });
  assert.equal(bashN.status, 0, `bash -n failed: ${bashN.stderr}`);
  const sh = readFileSync(shPath, 'utf-8');
  assert.match(sh, /rodar_tarefa 'faixa-2' 'T-002' '[\s\S]*?' 'claude-opus-5' high/); // T-002 overrides
  assert.match(sh, /--output-format stream-json/); // model stream for the panel
  assert.match(sh, /audit --ci/);

  // the dispatcher must actually accept re-running by lane
  const listar = spawnSync('bash', [shPath, '--listar'], {
    cwd: root,
    encoding: 'utf-8',
    env: { ...process.env, ONP_SPEC_HOME: homeOnp },
  });
  assert.equal(listar.status, 0, listar.stderr);
  assert.match(listar.stdout, /faixa-1\s+wave 1\s+T-001, T-003/);
  assert.match(listar.stdout, /faixa-2\s+wave 1\s+T-002/);
  assert.match(listar.stdout, /re-run a lane/);

  const html = readFileSync(path.join(dir, 'plano-execucao.html'), 'utf-8');
  assert.doesNotMatch(html, /<button/, 'execution is via agent — html without button');
  assert.match(html, /via agent/);

  const planoJson = JSON.parse(readFileSync(path.join(dir, 'plano.json'), 'utf-8'));
  assert.equal(planoJson.agent, 'claude');
  assert.equal(planoJson.modo, 'paralelo');
  assert.equal(planoJson.faixas.length, 2);
});

test('plano --sequencial (claude): one task after another, valid sh, no lanes', () => {
  const dir = path.join(root, '.spec', 'features', 'pagamentos');
  const { code, out } = cli('plano', 'pagamentos', '--agents', 'claude', '--sequencial');
  assert.equal(code, 0, out);
  assert.match(out, /SEQUENTIAL — user's choice/);
  assert.match(out, /one after another/);

  const planoJson = JSON.parse(readFileSync(path.join(dir, 'plano.json'), 'utf-8'));
  assert.equal(planoJson.modo, 'sequencial');
  assert.deepEqual(planoJson.faixas, []);
  assert.deepEqual(planoJson.sequenciais.map((t) => t.id), ['T-001', 'T-002', 'T-003']);

  const shPath = path.join(dir, 'executar-tarefas.sh');
  const bashN = spawnSync('bash', ['-n', shPath], { encoding: 'utf-8' });
  assert.equal(bashN.status, 0, `bash -n failed: ${bashN.stderr}`);
  const listar = spawnSync('bash', [shPath, '--listar'], {
    cwd: root,
    encoding: 'utf-8',
    env: { ...process.env, ONP_SPEC_HOME: homeOnp },
  });
  assert.equal(listar.status, 0, listar.stderr);
  assert.match(listar.stdout, /seq\s+T-001/);
  assert.doesNotMatch(listar.stdout, /faixa-1/);

  // switch back to the parallel plan for the following tests
  assert.equal(cli('plano', 'pagamentos', '--agents', 'claude').code, 0);
});

test('plano (antigravity): md with prompt per lane, no new sh/html and no claude -p', () => {
  const dir = path.join(root, '.spec', 'features', 'pagamentos');
  rmSync(path.join(dir, 'executar-tarefas.sh'));
  rmSync(path.join(dir, 'plano-execucao.html'));

  const { code, out } = cli('plano', 'pagamentos', '--agents', 'antigravity');
  assert.equal(code, 0, out);
  assert.match(out, /new agent \(clean window\) per lane/);
  const md = readFileSync(path.join(dir, 'plano-execucao.md'), 'utf-8');
  assert.match(md, /Prompt — faixa-1/);
  assert.match(md, /Antigravity/);
  assert.doesNotMatch(md, /claude -p/);
  assert.ok(!existsSync(path.join(dir, 'executar-tarefas.sh')), 'antigravity does not generate the sh');
  assert.ok(!existsSync(path.join(dir, 'plano-execucao.html')), 'antigravity does not generate the html');
  assert.equal(JSON.parse(readFileSync(path.join(dir, 'plano.json'), 'utf-8')).agent, 'antigravity');
});

test('plano (codex): md + sh with codex exec (valid bash) + html — no claude -p', () => {
  const dir = path.join(root, '.spec', 'features', 'pagamentos');
  const { code, out } = cli('plano', 'pagamentos', '--agents', 'codex');
  assert.equal(code, 0, out);
  assert.match(out, /execution plan \(codex\)/);
  assert.match(out, /headless executor/);
  // T-002 asked for claude-opus-5 — under codex that becomes the default with a warning
  assert.match(out, /claude-opus-5/);

  const md = readFileSync(path.join(dir, 'plano-execucao.md'), 'utf-8');
  assert.match(md, /Execution — Codex headless \(codex exec\)/);
  assert.doesNotMatch(md, /claude -p/);

  const shPath = path.join(dir, 'executar-tarefas.sh');
  assert.ok(statSync(shPath).mode & 0o100, 'script must be executable');
  const bashN = spawnSync('bash', ['-n', shPath], { encoding: 'utf-8' });
  assert.equal(bashN.status, 0, `bash -n failed: ${bashN.stderr}`);
  const sh = readFileSync(shPath, 'utf-8');
  assert.match(sh, /codex exec "\$3" --model "\$4" -c model_reasoning_effort="\$5"/);
  assert.match(sh, /STREAM_FLAGS=\(--json\)/);
  assert.match(sh, /--sandbox 'workspace-write'/);
  assert.match(sh, /rodar_tarefa 'faixa-2' 'T-002' '[\s\S]*?' 'gpt-5.6-terra' high/);
  assert.doesNotMatch(sh, /claude -p/);
  assert.match(sh, /audit --ci/);

  // dispatcher like the claude one: re-run by lane available
  const listar = spawnSync('bash', [shPath, '--listar'], {
    cwd: root,
    encoding: 'utf-8',
    env: { ...process.env, ONP_SPEC_HOME: homeOnp },
  });
  assert.equal(listar.status, 0, listar.stderr);
  assert.match(listar.stdout, /faixa-1\s+wave 1\s+T-001, T-003/);
  assert.match(listar.stdout, /re-run a lane/);

  const html = readFileSync(path.join(dir, 'plano-execucao.html'), 'utf-8');
  assert.doesNotMatch(html, /<button/);
  assert.match(html, /codex exec/);
  assert.match(html, /Ask the agent \(Codex\)/);
  assert.doesNotMatch(html, /claude -p/);

  const planoJson = JSON.parse(readFileSync(path.join(dir, 'plano.json'), 'utf-8'));
  assert.equal(planoJson.agent, 'codex');
  assert.equal(planoJson.modo, 'paralelo');
  assert.equal(planoJson.faixas.length, 2);
});

test('plano (cursor): md + sh with the Cursor CLI (valid bash) + html — no claude -p nor codex exec', () => {
  const dir = path.join(root, '.spec', 'features', 'pagamentos');
  const { code, out } = cli('plano', 'pagamentos', '--agents', 'cursor');
  assert.equal(code, 0, out);
  assert.match(out, /execution plan \(cursor\)/);
  assert.match(out, /headless executor/);
  // the cost list the agent presents for confirmation
  assert.match(out, /models for this plan — CONFIRM with the user before executing/);
  assert.match(out, /--modelo composer/);
  // T-002 asked for claude-opus-5 — in cursor claude-* is a valid slug: it stays
  assert.match(out, /T-002 — claude-opus-5/);

  const md = readFileSync(path.join(dir, 'plano-execucao.md'), 'utf-8');
  assert.match(md, /Execution — Cursor headless \(agent CLI\)/);
  assert.doesNotMatch(md, /claude -p/);
  assert.doesNotMatch(md, /codex exec/);

  const shPath = path.join(dir, 'executar-tarefas.sh');
  assert.ok(statSync(shPath).mode & 0o100, 'script must be executable');
  const bashN = spawnSync('bash', ['-n', shPath], { encoding: 'utf-8' });
  assert.equal(bashN.status, 0, `bash -n failed: ${bashN.stderr}`);
  const sh = readFileSync(shPath, 'utf-8');
  assert.match(sh, /CURSOR_BIN=\$\(command -v agent \|\| command -v cursor-agent\)/);
  assert.match(sh, /"\$CURSOR_BIN" -p "\$3" --model "\$4"/);
  assert.match(sh, /STREAM_FLAGS=\(--output-format stream-json\)/);
  assert.match(sh, /CURSOR_FLAGS=\(--force\)/);
  assert.match(sh, /rodar_tarefa 'faixa-2' 'T-002' '[\s\S]*?' 'claude-opus-5' high/);
  assert.doesNotMatch(sh, /claude -p/);
  assert.doesNotMatch(sh, /codex exec/);
  assert.doesNotMatch(sh, /--effort/, 'the Cursor CLI has no effort flag');
  assert.match(sh, /audit --ci/);

  // dispatcher like the claude one: re-run by lane available
  const listar = spawnSync('bash', [shPath, '--listar'], {
    cwd: root,
    encoding: 'utf-8',
    env: { ...process.env, ONP_SPEC_HOME: homeOnp },
  });
  assert.equal(listar.status, 0, listar.stderr);
  assert.match(listar.stdout, /faixa-1\s+wave 1\s+T-001, T-003/);
  assert.match(listar.stdout, /re-run a lane/);

  const html = readFileSync(path.join(dir, 'plano-execucao.html'), 'utf-8');
  assert.doesNotMatch(html, /<button/);
  assert.match(html, /agent -p/);
  assert.match(html, /Ask the agent \(Cursor\)/);
  assert.doesNotMatch(html, /claude -p/);

  const planoJson = JSON.parse(readFileSync(path.join(dir, 'plano.json'), 'utf-8'));
  assert.equal(planoJson.agent, 'cursor');
  assert.equal(planoJson.modo, 'paralelo');
  assert.equal(planoJson.faixas.length, 2);

  // --esforco in cursor: the plan warns that the CLI has no flag (the level
  // goes into the model slug) — the value is recorded, but nobody is fooled
  const comEsforco = cli('plano', 'pagamentos', '--agents', 'cursor', '--esforco', 'baixo');
  assert.equal(comEsforco.code, 0, comEsforco.out);
  assert.match(comEsforco.out, /the Cursor CLI has no effort flag/);
});

test('tarefa updates the status in tasks.md (and validates input)', () => {
  const { code, out } = cli('tarefa', 'pagamentos', 'T-002', 'done');
  assert.equal(code, 0, out);
  const tasks = readFileSync(path.join(root, '.spec', 'features', 'pagamentos', 'tasks.md'), 'utf-8');
  assert.match(tasks, /## T-002 — Envio de recibo \[done\]/);

  assert.equal(cli('tarefa', 'pagamentos', 'T-099', 'done').code, 2);
  assert.equal(cli('tarefa', 'pagamentos', 'T-001', 'meio-feita').code, 2);
});

test('tarefa --modelo/--esforco: the user adjusts the per-task cost without editing the file', () => {
  const tasksPath = path.join(root, '.spec', 'features', 'pagamentos', 'tasks.md');
  // inserts the fields into a task that didn't have them
  const r = cli('tarefa', 'pagamentos', 'T-001', '--modelo', 'gpt-5.6-luna', '--esforco', 'baixo');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Model: gpt-5\.6-luna/);
  assert.match(r.out, /regenerate the plan/);
  const tasks = readFileSync(tasksPath, 'utf-8');
  const secaoT001 = tasks.slice(tasks.indexOf('## T-001'), tasks.indexOf('## T-002'));
  assert.match(secaoT001, /- Model: gpt-5\.6-luna/);
  assert.match(secaoT001, /- Effort: baixo/);

  // replaces a field that already existed (T-002 had Model: claude-opus-5)
  const r2 = cli('tarefa', 'pagamentos', 'T-002', '--modelo', 'gpt-5.6-terra');
  assert.equal(r2.code, 0, r2.out);
  const secaoT002 = readFileSync(tasksPath, 'utf-8').slice(
    readFileSync(tasksPath, 'utf-8').indexOf('## T-002'),
    readFileSync(tasksPath, 'utf-8').indexOf('## T-003')
  );
  assert.match(secaoT002, /- Model: gpt-5\.6-terra/);
  assert.doesNotMatch(secaoT002, /claude-opus-5/, 'the old field was replaced, not duplicated');

  // invalid effort is blocked loud
  const r3 = cli('tarefa', 'pagamentos', 'T-001', '--esforco', 'turbo');
  assert.equal(r3.code, 2);
  assert.match(r3.out, /invalid effort/);

  // the regenerated plan uses the user's choice (and the parser read what we wrote)
  const p = cli('plano', 'pagamentos', '--agents', 'codex');
  assert.equal(p.code, 0, p.out);
  assert.match(p.out, /T-001 — gpt-5\.6-luna · effort low/);
  const sh = readFileSync(path.join(root, '.spec', 'features', 'pagamentos', 'executar-tarefas.sh'), 'utf-8');
  assert.match(sh, /rodar_tarefa 'faixa-1' 'T-001' '[\s\S]*?' 'gpt-5.6-luna' low/);
});

test('plano (codex) prints the cost list and --modelo/--esforco lock everything', () => {
  // the list the agent presents to the user for confirmation
  const semTrava = cli('plano', 'pagamentos', '--agents', 'codex');
  assert.match(semTrava.out, /CONFIRM with the user before executing/);
  assert.match(semTrava.out, /want to spend less\?/);

  // the user locked: everything luna/low, beating whatever is in tasks.md
  const { code, out } = cli('plano', 'pagamentos', '--agents', 'codex', '--modelo', 'gpt-5.6-luna', '--esforco', 'baixo');
  assert.equal(code, 0, out);
  assert.match(out, /T-001 — gpt-5\.6-luna · effort low/);
  assert.match(out, /T-003 — gpt-5\.6-luna · effort low/);
  const planoJson = JSON.parse(
    readFileSync(path.join(root, '.spec', 'features', 'pagamentos', 'plano.json'), 'utf-8')
  );
  assert.equal(planoJson.modeloForcado, 'gpt-5.6-luna');
  assert.equal(planoJson.esforcoForcado, 'low');
  const md = readFileSync(path.join(root, '.spec', 'features', 'pagamentos', 'plano-execucao.md'), 'utf-8');
  assert.match(md, /cost locked by the user/);

  // claude model in a codex plan is an error, not a silent swap
  const errado = cli('plano', 'pagamentos', '--agents', 'codex', '--modelo', 'claude-opus-5');
  assert.equal(errado.code, 2);
  assert.match(errado.out, /is a Claude model/);
});

test('upgrade: plan from a previous version (without runId) is registered in the ledger instead of vanishing', () => {
  const planoPath = path.join(root, '.spec', 'features', 'pagamentos', 'plano.json');
  // simulates the artifact of a version that had no ledger
  const antigo = JSON.parse(readFileSync(planoPath, 'utf-8'));
  delete antigo.runId;
  writeFileSync(planoPath, JSON.stringify(antigo, null, 2));

  // regenerating the plan registers the execution in the global ledger (the summary's source)
  const r = cli('plano', 'pagamentos');
  assert.equal(r.code, 0, r.out);
  const novo = JSON.parse(readFileSync(planoPath, 'utf-8'));
  assert.ok(novo.runId, 'regenerated plan gets an execution identifier');

  // and the ledger starts to know that execution
  const ledger = readFileSync(path.join(homeOnp, 'painel', 'ledger.jsonl'), 'utf-8');
  assert.ok(ledger.includes(novo.runId), 'execution registered in the global ledger');
  assert.ok(ledger.includes('"tipo":"plano"'));
});

test('plano detects the agent by what is installed when there is no flag', () => {
  // this root has .claude/skills AND .agents/skills (codex) → claude has precedence
  const { code, out } = cli('plano', 'pagamentos');
  assert.equal(code, 0, out);
  assert.match(out, /execution plan \(claude\)/);
});

test('codex embedded engine detects codex by its OWN marker (even with .claude in the project)', () => {
  const embarcado = path.join(root, '.agents', 'skills', 'onp-spec-driven', 'scripts', 'onp-spec.mjs');
  const proc = spawnSync('node', [embarcado, 'plano', 'pagamentos'], {
    cwd: root,
    encoding: 'utf-8',
    env: { ...process.env, ONP_SPEC_HOME: homeOnp },
  });
  assert.equal(proc.status, 0, `${proc.stdout}\n${proc.stderr}`);
  assert.match(proc.stdout, /execution plan \(codex\)/);
});

test('without .claude, detection uses the marker of the skill installed in .agents (codex)', () => {
  rmSync(path.join(root, '.claude'), { recursive: true, force: true });
  const { code, out } = cli('plano', 'pagamentos');
  assert.equal(code, 0, out);
  assert.match(out, /execution plan \(codex\)/);
});

test('cursor embedded engine detects cursor by its OWN marker (even with .agents in the project)', () => {
  const embarcado = path.join(root, '.cursor', 'skills', 'onp-spec-driven', 'scripts', 'onp-spec.mjs');
  const proc = spawnSync('node', [embarcado, 'plano', 'pagamentos'], {
    cwd: root,
    encoding: 'utf-8',
    env: { ...process.env, ONP_SPEC_HOME: homeOnp },
  });
  assert.equal(proc.status, 0, `${proc.stdout}\n${proc.stderr}`);
  assert.match(proc.stdout, /execution plan \(cursor\)/);
});

test('without .claude and without .agents, detection uses the marker of the skill installed in .cursor', () => {
  rmSync(path.join(root, '.agents'), { recursive: true, force: true });
  const { code, out } = cli('plano', 'pagamentos');
  assert.equal(code, 0, out);
  assert.match(out, /execution plan \(cursor\)/);
});

test('engine in a checkout under ~/.cursor/worktrees does NOT become cursor detection (only .cursor/skills counts)', () => {
  // Cursor's parallel agents check out repositories in
  // ~/.cursor/worktrees/<repo> — an engine running from there is NOT the
  // cursor skill, and detection must respect what is installed in the project
  assert.equal(cli('init', '--agents', 'claude').code, 0);
  const fake = path.join(root, 'fake-home', '.cursor', 'worktrees', 'onp-spec-driven');
  mkdirSync(fake, { recursive: true });
  const REPO_RAIZ = path.join(__dirname, '..');
  cpSync(path.join(REPO_RAIZ, 'src'), path.join(fake, 'src'), { recursive: true });
  cpSync(path.join(REPO_RAIZ, 'bin'), path.join(fake, 'bin'), { recursive: true });
  const proc = spawnSync('node', [path.join(fake, 'bin', 'onp-spec.js'), 'plano', 'pagamentos'], {
    cwd: root,
    encoding: 'utf-8',
    env: { ...process.env, ONP_SPEC_HOME: homeOnp },
  });
  assert.equal(proc.status, 0, `${proc.stdout}\n${proc.stderr}`);
  assert.match(proc.stdout, /execution plan \(claude\)/, 'the project skill (.claude) decides, not the engine path');
});
