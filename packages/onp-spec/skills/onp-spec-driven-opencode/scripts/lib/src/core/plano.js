// Execution plan — turns the pending tasks of tasks.md into LANES: tasks with
// disjoint `Files:` can run in PARALLEL (1 lane = 1 git worktree + 1 branch +
// 1 clean context window); tasks that share a file fall into the SAME lane
// (sequence within it); a task without `Files:` has unknown footprint → runs
// at the end, one by one, on the main tree.
//
// PARALLELIZING IS THE USER'S CHOICE: the agent asks first — including WHICH
// tasks to parallelize. With `--paralelizar T-001,T-003`, only the chosen ones
// compete for lanes; the rest run one after another, on the main tree, after
// the waves. With `--sequencial`, the plan runs ALL tasks one after another
// (no worktrees) — same commit discipline and same gate.
//
// The plan CALCULATION is agent-agnostic. The ARTIFACTS vary:
//   claude      → plano-execucao.md + executar-tarefas.sh (claude -p headless,
//                 with --model and --effort per task, and the general progress
//                 summary every 1 min in the terminal) + plano-execucao.html
//                 (visual, read-only)
//   codex       → same artifacts as claude, but the executor runs
//                 `codex exec` headless (--json, --sandbox, --model and
//                 model_reasoning_effort per task) — never depends on the
//                 Claude CLI
//   cursor      → same artifacts as claude, but the executor runs the Cursor
//                 CLI (`agent -p`, legacy `cursor-agent`) with
//                 --output-format stream-json and --force (without --force the
//                 print mode doesn't modify files); Cursor has no effort flag —
//                 effort is a suffix of the model slug
//   antigravity → plano-execucao.md with worktree commands and a ready PROMPT
//                 per lane, for Antigravity's native parallel agents (never
//                 depends on any CLI)

import path from 'path';
import { foldStatus } from '../util/text.js';

export const AGENTES = ['claude', 'antigravity', 'codex', 'cursor', 'opencode'];

// agents whose plan generates executar-tarefas.sh + plano-execucao.html (their
// own headless CLI); antigravity runs with its native agents
export function usaExecutorSh(agent) {
  return agent === 'claude' || agent === 'codex' || agent === 'cursor' || agent === 'opencode';
}

// effort accepted in PT or EN → CLI level (`claude --effort <level>`)
export const ESFORCO_CLI = {
  baixo: 'low',
  low: 'low',
  medio: 'medium',
  medium: 'medium',
  alto: 'high',
  high: 'high',
  xalto: 'xhigh',
  xhigh: 'xhigh',
  max: 'max',
  maximo: 'max',
};

export function normalizarEsforco(raw) {
  if (!raw) return null;
  return ESFORCO_CLI[foldStatus(String(raw)).replace(/[\s_-]/g, '')] || null;
}

// codex defaults when the config still carries a claude-* model (the config
// has claude defaults; a model from another CLI would break codex exec)
const MODELO_CODEX = 'gpt-5.6-terra';
const RESUMO_MODEL_CODEX = 'gpt-5.6-luna';
// opencode takes provider/model — a bare claude slug becomes anthropic/<slug>;
// the cheap default becomes an openai-qualified slug
const RESUMO_MODEL_OPENCODE = 'openai/gpt-5.6-luna';
const ehModeloClaude = (m) => /^claude-/.test(String(m || ''));

// in Cursor, claude-* models are VALID slugs (Cursor serves Claude, GPT,
// Gemini and its own models) — nothing is swapped. Only the per-minute summary
// model changes when it's still the claude-haiku-4-5 default (not a Cursor
// slug): it becomes composer, the in-house model with usage included in plans.
const RESUMO_MODEL_CURSOR = 'composer';
const RESUMO_MODEL_DEFAULT = 'claude-haiku-4-5';

// codex has no "max" level — the ceiling of model_reasoning_effort is xhigh.
// opencode mirrors codex: its --variant reasoning effort tops out at "max".
export function esforcoParaAgente(esforcoCli, agent) {
  if (agent === 'codex' && esforcoCli === 'max') return 'xhigh';
  return esforcoCli;
}

export function resumoModelParaAgente(cfg, agent) {
  const m = cfg.resumoModel || RESUMO_MODEL_DEFAULT;
  if (agent === 'codex' && ehModeloClaude(m)) return RESUMO_MODEL_CODEX;
  if (agent === 'cursor' && m === RESUMO_MODEL_DEFAULT) return RESUMO_MODEL_CURSOR;
  if (agent === 'opencode' && ehModeloClaude(m)) return RESUMO_MODEL_OPENCODE;
  if (agent === 'opencode') return m;
  return m;
}

function intersecta(setA, arrB) {
  return arrB.some((f) => setA.has(f));
}

function normFile(f) {
  return f.split('\\').join('/').replace(/^\.\//, '');
}

// ── calculation ─────────────────────────────────────────────────────────────

export function montarPlano(project, featureName, opts = {}) {
  const agent = AGENTES.includes(opts.agent) ? opts.agent : 'claude';
  const feature = project.features.find((f) => f.name === featureName);
  if (!feature) return { erro: `feature "${featureName}" not found in ${project.config.specDir}/features/` };
  if (!feature.tasks || !feature.tasks.tasks.length) {
    return { erro: `feature "${featureName}" has no tasks in tasks.md — write the tasks (T-xxx) first` };
  }

  const cfg = project.config.paralelo;
  const avisos = [];

  // explicit user choice for the WHOLE plan (--modelo/--esforco): overrides
  // tasks.md and config — this is how someone on a tight license caps the
  // token spend without editing any file
  let esforcoForcado = null;
  if (opts.esforco != null) {
    esforcoForcado = normalizarEsforco(opts.esforco);
    if (!esforcoForcado) {
      return { erro: `--esforco "${opts.esforco}" unknown (accepted: low|medium|high|xhigh|max)` };
    }
  }
  const modeloForcado = opts.modelo || null;
  if (modeloForcado && agent === 'codex' && ehModeloClaude(modeloForcado)) {
    return {
      erro: `--modelo "${modeloForcado}" is a Claude model — this plan is for codex (use a Codex model, e.g.: gpt-5.6-terra, gpt-5.6-luna)`,
    };
  }
  if (modeloForcado && agent === 'opencode' && !modeloForcado.includes('/') && !ehModeloClaude(modeloForcado)) {
    return {
      erro: `--modelo "${modeloForcado}" is not a valid opencode model — opencode takes provider/model (e.g.: anthropic/claude-sonnet-5, openai/gpt-5.6-terra, bedrock/...)`,
    };
  }

  // titles of the acceptance criteria, for human context in the prompts
  const acTitulo = {};
  for (const f of project.features) {
    if (!f.spec) continue;
    for (const s of f.spec.stories) for (const ac of s.acs) acTitulo[ac.id] = ac.title || '';
  }

  const concluidas = [];
  const pendentes = [];
  for (const t of feature.tasks.tasks) {
    if (t.status === 'done') {
      concluidas.push(t);
      continue;
    }
    if (t.status === 'in-progress') {
      avisos.push(`${t.id} is [in-progress] — it joined the plan; if there's local work, commit it before executing`);
    }
    const esforcoRaw = esforcoForcado || t.esforco || cfg.esforco;
    const esforcoCli = normalizarEsforco(esforcoRaw);
    if (!esforcoCli) {
      avisos.push(`${t.id}: unknown effort "${esforcoRaw}" — using "medium" (accepted: low|medium|high|xhigh|max)`);
    }
    let model = modeloForcado || t.model || cfg.model;
    if (agent === 'codex' && ehModeloClaude(model)) {
      if (t.model) avisos.push(`${t.id}: model "${model}" is a Claude model — under codex it will run with "${MODELO_CODEX}"`);
      model = MODELO_CODEX;
    }
    if (agent === 'opencode' && ehModeloClaude(model) && !model.includes('/')) {
      if (t.model) avisos.push(`${t.id}: model "${model}" is a bare Claude slug — under opencode it will run as "anthropic/${model}"`);
      model = `anthropic/${model}`;
    }
    pendentes.push({
      ...t,
      files: t.files.map(normFile),
      model,
      esforcoCli: esforcoParaAgente(esforcoCli || 'medium', agent),
      acs: t.refs.filter((r) => r.startsWith('AC-')),
    });
  }

  if (!pendentes.length) {
    return { erro: `all tasks of "${featureName}" are already [done] — nothing to plan` };
  }

  // sequential mode (user's choice): no lanes, no worktrees — ALL tasks run
  // one after another, on the main tree, in the tasks.md order; the commit
  // discipline and the gate stay the same
  if (opts.sequencial) {
    pendentes.sort((a, b) => a.line - b.line);
    return fecharPlano(project, featureName, {
      agent,
      opts,
      cfg,
      avisos,
      acTitulo,
      concluidas,
      modo: 'sequencial',
      faixas: [],
      ondas: [],
      sequenciais: pendentes,
      modeloForcado,
      esforcoForcado,
    });
  }

  // user's selection (--paralelizar T-001,T-003): only the chosen ones
  // compete for lanes; the rest run at the end, one by one, on the main
  // tree — same commit discipline and same gate
  let selecao = null;
  if (Array.isArray(opts.paralelizar)) {
    selecao = [...new Set(opts.paralelizar)];
    if (!selecao.length) {
      return { erro: 'empty selection in --paralelizar — to run everything one after another, use --sequencial' };
    }
    const ids = new Set(pendentes.map((t) => t.id));
    const desconhecidas = selecao.filter((id) => !ids.has(id));
    if (desconhecidas.length) {
      return {
        erro: `--paralelizar cites task(s) that are not pending in "${featureName}": ${desconhecidas.join(', ')}`,
      };
    }
  }

  // group by file conflict: connected components become lanes
  const escolhida = (t) => !selecao || selecao.includes(t.id);
  const comArquivos = pendentes.filter((t) => t.files.length && escolhida(t));
  const sequenciais = pendentes.filter((t) => !t.files.length || !escolhida(t));
  for (const t of sequenciais) {
    if (!t.files.length) {
      t.motivoSeq = 'no `Files:` — unknown footprint';
      avisos.push(`${t.id} lists no Files: — unknown footprint, it will run alone at the end (no parallelism)`);
    } else {
      t.motivoSeq = 'outside the user\'s selection';
    }
  }

  const faixas = [];
  for (const t of comArquivos) {
    const donos = faixas.filter((fx) => intersecta(fx.fileSet, t.files));
    if (!donos.length) {
      faixas.push({ tasks: [t], fileSet: new Set(t.files) });
    } else {
      // conflicts with 1+ lanes: merge them all into the first and add the task
      const alvo = donos[0];
      for (const outra of donos.slice(1)) {
        alvo.tasks.push(...outra.tasks);
        for (const f of outra.fileSet) alvo.fileSet.add(f);
        faixas.splice(faixas.indexOf(outra), 1);
      }
      alvo.tasks.push(t);
      for (const f of t.files) alvo.fileSet.add(f);
    }
  }
  // stable order: by the first task (tasks.md order)
  faixas.sort((a, b) => a.tasks[0].line - b.tasks[0].line);
  for (const fx of faixas) fx.tasks.sort((a, b) => a.line - b.line);

  const repoName = path.basename(project.config.rootDir);
  const featureSlug = shellTok(featureName);
  const repoSlug = shellTok(repoName);
  faixas.forEach((fx, i) => {
    fx.id = `faixa-${i + 1}`;
    fx.branch = `spec/${featureSlug}-faixa-${i + 1}`;
    fx.worktree = `../onp-worktrees/${repoSlug}-${featureSlug}-faixa-${i + 1}`;
  });

  // waves: at most maxParalelas simultaneous lanes
  const max = Math.max(1, cfg.maxParalelas | 0 || 3);
  const ondas = [];
  for (let i = 0; i < faixas.length; i += max) ondas.push(faixas.slice(i, i + max));

  return fecharPlano(project, featureName, {
    agent,
    opts,
    cfg,
    avisos,
    acTitulo,
    concluidas,
    modo: 'paralelo',
    faixas,
    ondas,
    sequenciais,
    paralelizar: selecao,
    modeloForcado,
    esforcoForcado,
  });
}

// fields common to both modes (parallel and sequential)
function fecharPlano(project, featureName, { agent, opts, cfg, avisos, acTitulo, concluidas, modo, faixas, ondas, sequenciais, paralelizar = null, modeloForcado = null, esforcoForcado = null }) {
  const repoName = path.basename(project.config.rootDir);
  // how to invoke the engine from the project root
  let engine = opts.enginePath || 'onp-spec';
  if (path.isAbsolute(engine)) {
    const rel = path.relative(project.config.rootDir, engine);
    if (!rel.startsWith('..')) engine = rel.split(path.sep).join('/');
  }

  return {
    agent,
    modo,
    feature: featureName,
    // identity of this execution in the global ledger (changes on each generated plan)
    runId: opts.runId || `${shellTok(repoName)}-${shellTok(featureName)}-${Date.now().toString(36)}`,
    specDir: project.config.specDir,
    baseDir: `${project.config.specDir}/features/${featureName}`,
    branchTrabalho: `spec/${featureName}`,
    repoName,
    testCommand: project.config.testCommand || null,
    cfg,
    engine,
    acTitulo,
    faixas,
    ondas,
    sequenciais,
    paralelizar,
    modeloForcado,
    esforcoForcado,
    concluidas,
    avisos,
    geradoEm: (opts.now || new Date()).toISOString().slice(0, 16).replace('T', ' '),
  };
}

// ── prompts ────────────────────────────────────────────────────────────────

function linhasRegras(plan) {
  const teste = plan.testCommand
    ? `Run the tests locally with \`${plan.testCommand}\` until they pass.`
    : 'Run the project\'s tests locally until they pass.';
  return [
    'Non-negotiable rules:',
    '- Every referenced acceptance criterion becomes a test with @spec:AC-xxx in the title.',
    '- NEVER weaken, skip (skip/todo) or delete a test to pass — a skipped test is not proof and the audit flags it.',
    `- ${teste}`,
    '- Do NOT edit tasks.md, do NOT run onp-spec verify/audit and do NOT touch other tasks — the orchestrator handles that.',
    '- At the end of EACH task: `git add` only what you touched and one commit of your own.',
  ];
}

function descreveTarefa(plan, t) {
  const acs = t.acs.map((id) => (plan.acTitulo[id] ? `${id} (${plan.acTitulo[id]})` : id));
  const refs = acs.length ? acs.join(', ') : t.refs.join(', ') || '—';
  const arquivos = t.files.length ? t.files.join(', ') : '(to be defined by the task)';
  return [
    `${t.id} — "${t.title}"`,
    `  criteria/refs: ${refs}`,
    `  allowed files (and their tests): ${arquivos}`,
    `  commit message: "${t.id} ${shellTok(plan.feature)}: ${t.title}"`,
  ];
}

// prompt for ONE task (claude headless script and sequential tasks)
export function promptTarefa(plan, t) {
  return [
    `You execute ONE task of feature "${shellTok(plan.feature)}" (onp-spec flow, spec-anchored).`,
    `Read first: ${baseDirPrompt(plan)}/spec.md, ${baseDirPrompt(plan)}/tasks.md and .spec/constituicao.md.`,
    '',
    'Your task (only it):',
    ...descreveTarefa(plan, t),
    '',
    ...linhasRegras(plan),
  ].join('\n');
}

// prompt for an ENTIRE lane (one clean window runs the tasks in order)
export function promptFaixa(plan, fx, { worktree = true } = {}) {
  const onde = worktree
    ? `Work ONLY inside the worktree ${fx.worktree} (branch ${fx.branch}) — already prepared.`
    : 'Work on the repository\'s main tree.';
  return [
    `You execute the tasks of ${fx.id} of feature "${shellTok(plan.feature)}" (onp-spec flow, spec-anchored).`,
    onde,
    `Read first: ${baseDirPrompt(plan)}/spec.md, ${baseDirPrompt(plan)}/tasks.md and .spec/constituicao.md.`,
    '',
    `Execute IN THIS ORDER (1 task = 1 commit):`,
    ...fx.tasks.flatMap((t) => descreveTarefa(plan, t)),
    '',
    ...linhasRegras(plan),
    'When the last task is committed, STOP and report the result — the merge is the orchestrator\'s job.',
  ].join('\n');
}

// ── artifact: plano.json (machine reading — feeds the ledger/resumo) ────────

export function renderPlanoJson(plan) {
  const tarefa = (t) => ({
    id: t.id,
    titulo: t.title,
    modelo: t.model,
    esforco: t.esforcoCli,
    arquivos: t.files,
    refs: t.refs,
  });
  return `${JSON.stringify(
    {
      runId: plan.runId,
      feature: plan.feature,
      agent: plan.agent,
      modo: plan.modo,
      paralelizar: plan.paralelizar || null,
      modeloForcado: plan.modeloForcado || null,
      esforcoForcado: plan.esforcoForcado || null,
      geradoEm: plan.geradoEm,
      branchTrabalho: plan.branchTrabalho,
      baseDir: plan.baseDir,
      specDir: plan.specDir,
      repoName: plan.repoName,
      logsDir: `../onp-worktrees/${plan.repoName}-${plan.feature}-logs`,
      ondas: plan.ondas.map((onda) => onda.map((fx) => fx.id)),
      faixas: plan.faixas.map((fx) => ({
        id: fx.id,
        branch: fx.branch,
        worktree: fx.worktree,
        tarefas: fx.tasks.map(tarefa),
      })),
      sequenciais: plan.sequenciais.map(tarefa),
      concluidas: plan.concluidas.map((t) => t.id),
      avisos: plan.avisos,
    },
    null,
    2
  )}\n`;
}

// ── artifact: plano-execucao.md ─────────────────────────────────────────────

function tabelaFaixa(plan, fx) {
  const linhas = [
    '| task | title | model | effort | files |',
    '|---|---|---|---|---|',
  ];
  for (const t of fx.tasks) {
    linhas.push(`| ${t.id} | ${t.title} | \`${t.model}\` | ${t.esforcoCli} | ${t.files.map((f) => `\`${f}\``).join(', ') || '—'} |`);
  }
  return linhas;
}

// flags that reproduce this plan (for the "regenerate with" of the artifacts)
function flagsRegenerar(plan) {
  let flags = '';
  if (plan.modo === 'sequencial') flags += ' --sequencial';
  else if (plan.paralelizar) flags += ` --paralelizar ${plan.paralelizar.join(',')}`;
  if (plan.modeloForcado) flags += ` --modelo ${plan.modeloForcado}`;
  if (plan.esforcoForcado) flags += ` --esforco ${plan.esforcoForcado}`;
  return flags;
}

export function renderPlanoMd(plan) {
  const L = [];
  const paralelas = plan.faixas.reduce((n, fx) => n + fx.tasks.length, 0);
  const sequencial = plan.modo === 'sequencial';
  L.push(`# Execution plan — ${plan.feature}`);
  L.push('');
  L.push(`> generated by \`onp-spec plano\` at ${plan.geradoEm} — do NOT edit by hand;`);
  L.push(`> changed tasks.md or the config? Regenerate: \`onp-spec plano ${plan.feature}${flagsRegenerar(plan)}\``);
  L.push('');
  L.push('## Summary — what is going to happen');
  L.push('');
  if (sequencial) {
    L.push(`- **SEQUENTIAL mode (user's choice)**: ${plan.sequenciais.length} pending task(s), ONE AFTER ANOTHER, on the main tree${plan.concluidas.length ? ` (${plan.concluidas.length} already done: ${plan.concluidas.map((t) => t.id).join(', ')})` : ''}`);
    L.push('- no worktrees and no parallelism — each task runs in a clean context window, in the tasks.md order');
  } else {
    L.push(`- **${paralelas + plan.sequenciais.length} pending task(s)**: ${paralelas} in ${plan.faixas.length} parallel lane(s) + ${plan.sequenciais.length} sequential${plan.concluidas.length ? ` (${plan.concluidas.length} already done: ${plan.concluidas.map((t) => t.id).join(', ')})` : ''}`);
    if (plan.paralelizar) {
      L.push(`- **user's selection**: parallelize only ${plan.paralelizar.join(', ')} — the rest run one after another, at the end`);
    }
    L.push(`- **1 lane = 1 worktree + 1 branch + 1 clean context window** — lanes share no files with each other`);
    L.push(`- prefer another selection or one after another? Regenerate with \`onp-spec plano ${plan.feature} --paralelizar T-xxx,T-yyy\` or \`--sequencial\``);
  }
  if (plan.modeloForcado || plan.esforcoForcado) {
    const partes = [];
    if (plan.modeloForcado) partes.push(`model \`${plan.modeloForcado}\``);
    if (plan.esforcoForcado) partes.push(`effort \`${plan.esforcoForcado}\``);
    L.push(`- **cost locked by the user**: ${partes.join(' · ')} in ALL tasks (overrides tasks.md and config)`);
  }
  L.push(`- everything happens on the work branch \`${plan.branchTrabalho}\`; merging to main is your decision`);
  if (plan.avisos.length) {
    L.push('');
    L.push('### Warnings');
    L.push('');
    for (const a of plan.avisos) L.push(`- ⚠ ${a}`);
  }
  L.push('');
  if (!sequencial) {
    L.push('## Lanes and waves');
    L.push('');
    plan.ondas.forEach((onda, i) => {
      L.push(`### Wave ${i + 1} — ${onda.map((fx) => fx.id).join(' ∥ ')}`);
      L.push('');
      for (const fx of onda) {
        L.push(`#### ${fx.id} — branch \`${fx.branch}\` — worktree \`${fx.worktree}\``);
        L.push('');
        L.push(...tabelaFaixa(plan, fx));
        L.push('');
      }
    });
  }
  if (plan.sequenciais.length) {
    L.push(sequencial ? '## Execution order (one task after another)' : '## Sequential tasks (after the waves, on the main tree)');
    L.push('');
    L.push(`| task | title | model | effort |${sequencial ? '' : ' why sequential |'}`);
    L.push(`|---|---|---|---|${sequencial ? '' : '---|'}`);
    for (const t of plan.sequenciais) {
      L.push(`| ${t.id} | ${t.title} | \`${t.model}\` | ${t.esforcoCli} |${sequencial ? '' : ` ${t.motivoSeq || '—'} |`}`);
    }
    L.push('');
  }
  L.push('## Branch and commit management');
  L.push('');
  L.push(`1. work branch \`${plan.branchTrabalho}\` created from the current point (if it doesn\'t exist yet)`);
  if (sequencial) {
    L.push('2. the tasks run on it, in order — **1 task = 1 commit** (`T-xxx feature: title`), marked `[done]` only with work actually done');
    L.push(`3. final gate on the work branch: \`onp-spec verify ${plan.feature}\` + \`onp-spec audit --ci\` — **exit 0 or it isn't ready**`);
  } else {
    L.push('2. each lane is born from it as its own branch and runs in its own worktree — **1 task = 1 commit** (`T-xxx feature: title`)');
    L.push('3. wave finished → merge `--no-ff` of each lane back, in order; a conflict stops the lane and asks for human resolution');
    L.push('4. merged lane → worktree removed, branch deleted, task marked `[done]` in tasks.md');
    L.push(`5. final gate on the work branch: \`onp-spec verify ${plan.feature}\` + \`onp-spec audit --ci\` — **exit 0 or it isn't ready**`);
  }
  L.push('');
  L.push('## How to execute');
  L.push('');
  if (usaExecutorSh(plan.agent)) {
    const codex = plan.agent === 'codex';
    const cursor = plan.agent === 'cursor';
    const opencode = plan.agent === 'opencode';
    const cliTarefa = codex
      ? '`codex exec`'
      : cursor
        ? '`agent -p` (Cursor CLI)'
        : opencode
          ? '`opencode run`'
          : '`claude -p`';
    const ajustes = codex
      ? `\`--model\` and \`model_reasoning_effort\` already set per task and sandbox \`${plan.cfg.sandbox}\``
      : cursor
        ? '`--model` already set per task and `--force` (without it Cursor\'s print mode doesn\'t modify files)'
        : opencode
          ? '`--model` and `--variant` already set per task'
          : `\`--model\` and \`--effort\` already set per task and permissions \`${plan.cfg.permissionMode}\``;
    L.push(
      codex
        ? '### ▶ Execution — Codex headless (codex exec)'
        : cursor
          ? '### ▶ Execution — Cursor headless (agent CLI)'
          : opencode
            ? '### ▶ Execution — opencode headless (opencode run)'
            : '### ▶ Execution — Claude Code headless'
    );
    L.push('');
    L.push('```bash');
    L.push(`bash ${plan.baseDir}/executar-tarefas.sh`);
    L.push('```');
    L.push('');
    if (sequencial) {
      L.push(`Each task runs ${cliTarefa} with a **clean context window**, on the main tree,`);
      L.push(`one after another, with ${ajustes}.`);
      L.push('The exact prompts are embedded in the script.');
    } else {
      L.push(`Each lane runs ${cliTarefa} with a **clean context window**, in its worktree, with`);
      L.push(`${ajustes}. The exact prompts are`);
      L.push('embedded in the script — want to run a lane by hand, just copy them from there.');
    }
    L.push(`Logs: \`../onp-worktrees/${plan.repoName}-${plan.feature}-logs/\`.`);
    if (codex) {
      L.push('');
      L.push('**Cost confirmation — before executing**: the models and efforts per');
      L.push('task are in the tables above; the agent CONFIRMS with the user that they are');
      L.push('within his license/quota (strong model + high effort burns tokens).');
      L.push(`To spend less: \`onp-spec plano ${plan.feature} --modelo gpt-5.6-luna --esforco baixo\``);
      L.push(`(all) or per task \`onp-spec tarefa ${plan.feature} T-xxx --modelo <m> --esforco <level>\` — and regenerate the plan.`);
    }
    if (opencode) {
      L.push('');
      L.push('**Cost confirmation — before executing**: the models per task are in the');
      L.push('tables above (opencode format `provider/model`); the agent CONFIRMS with');
      L.push('the user that they are within his license/quota. To spend less:');
      L.push(`\`onp-spec plano ${plan.feature} --modelo openai/gpt-5.6-luna --esforco baixo\``);
      L.push(`(all) or per task \`onp-spec tarefa ${plan.feature} T-xxx --modelo <provider/model> --esforco <level>\` — and regenerate the plan.`);
    }
    if (cursor) {
      L.push('');
      L.push('**Cost confirmation — before executing**: the models per task are');
      L.push('in the tables above; the agent CONFIRMS with the user that they fit his');
      L.push('Cursor plan (claude-*/gpt-* models are billed per usage; `composer` has');
      L.push(`usage included in paid plans). To spend less: \`onp-spec plano ${plan.feature} --modelo composer\``);
      L.push(`(all) or per task \`onp-spec tarefa ${plan.feature} T-xxx --modelo <m>\` — and regenerate the plan.`);
      L.push('');
      L.push('**Effort in Cursor**: the CLI has no effort flag — the level goes embedded');
      L.push('in the model slug (e.g.: `gpt-5.6-terra-high`). The "effort" column above is');
      L.push('informative and does NOT become a flag; to control the effort, choose the slug.');
    }
    L.push('');
    L.push('### 📣 Monitoring — table + summary in the chat (every 1 min)');
    L.push('');
    L.push('The script runs in **background**: the agent WARNS the user before starting and,');
    L.push('while it runs, posts in the chat every ~1 minute the **progress table** (which');
    L.push('task is running, which isn\'t, what finished/failed) together with the');
    L.push('**general progress summary** (AI-written; without AI, the engine summarizes). When');
    L.push('done, the user receives the full execution summary. At any time:');
    L.push('');
    L.push('```bash');
    L.push(`onp-spec resumo ${plan.feature} --tabela   # the progress table`);
    L.push(`onp-spec resumo ${plan.feature}            # the text summary`);
    L.push('```');
  } else if (sequencial) {
    L.push('### ▶ Sequential on Antigravity (one task after another, no Claude CLI)');
    L.push('');
    L.push('1. **Enter the work branch** (terminal, at the repo root):');
    L.push('');
    L.push('```bash');
    L.push(`git checkout -b ${plan.branchTrabalho}   # or: git checkout ${plan.branchTrabalho}`);
    L.push('```');
    L.push('');
    L.push('2. **Execute the tasks IN ORDER, one after another** (clean window per task');
    L.push('   helps focus; the next only starts when the previous committed):');
    L.push('');
    for (const t of plan.sequenciais) {
      L.push(`#### Prompt — ${t.id}`);
      L.push('');
      L.push('```');
      L.push(promptTarefa(plan, t));
      L.push('```');
      L.push('');
      L.push(`\`node ${plan.engine} tarefa ${plan.feature} ${t.id} done\` after the commit.`);
      L.push('');
    }
    L.push('3. **Final gate** (exit 0 or it isn\'t ready):');
    L.push('');
    L.push('```bash');
    L.push(`node ${plan.engine} verify ${plan.feature}`);
    L.push(`node ${plan.engine} audit --ci`);
    L.push('```');
    L.push('');
    L.push('4. **Monitoring (every ~1 min, while it runs)**: warn BEFORE starting');
    L.push('   that the work runs in background and that the full summary comes at the end. Mark');
    L.push('   each task in the ledger when starting and finishing (that\'s what the table is made of):');
    L.push('');
    L.push('```bash');
    L.push(`node ${plan.engine} evento --run ${plan.runId} --tipo tarefa --tarefa <T-xxx> --faixa seq --estado running   # when starting`);
    L.push(`node ${plan.engine} evento --run ${plan.runId} --tipo tarefa --tarefa <T-xxx> --faixa seq --estado done      # after the commit`);
    L.push('```');
    L.push('');
    L.push('   And every ~1 min post in the chat the progress TABLE + a short paragraph,');
    L.push('   recording the text in the ledger:');
    L.push('');
    L.push('```bash');
    L.push(`node ${plan.engine} resumo ${plan.feature} --tabela   # the table — paste in the chat`);
    L.push(`node ${plan.engine} resumo ${plan.feature} --gravar --origem ai --texto "<2 to 4 sentences of what is going on>"`);
    L.push('```');
  } else {
    L.push('### ▶ Native parallel on Antigravity (clean windows, no Claude CLI)');
    L.push('');
    L.push('1. **Prepare the work branch and the worktrees** (terminal, at the repo root):');
    L.push('');
    L.push('```bash');
    L.push(`git checkout -b ${plan.branchTrabalho}   # or: git checkout ${plan.branchTrabalho}`);
    for (const fx of plan.faixas) {
      L.push(`git worktree add ${fx.worktree} -b ${fx.branch}`);
    }
    L.push('```');
    L.push('');
    L.push('2. **Open a NEW agent per lane** (clean window) and paste the lane prompt:');
    L.push('');
    for (const fx of plan.faixas) {
      L.push(`#### Prompt — ${fx.id}`);
      L.push('');
      L.push('```');
      L.push(promptFaixa(plan, fx));
      L.push('```');
      L.push('');
    }
    L.push('3. **All done? Merge in order and mark the tasks** (on the main tree):');
    L.push('');
    L.push('```bash');
    for (const fx of plan.faixas) {
      L.push(`git merge --no-ff ${fx.branch} -m "merge ${fx.id} (${plan.feature})"`);
      L.push(`git worktree remove ${fx.worktree} && git branch -d ${fx.branch}`);
      for (const t of fx.tasks) L.push(`node ${plan.engine} tarefa ${plan.feature} ${t.id} done`);
    }
    L.push('```');
    if (plan.sequenciais.length) {
      L.push('');
      L.push('4. **Sequential tasks** — execute them yourself (same or new window), one by one:');
      L.push('');
      for (const t of plan.sequenciais) {
        L.push('```');
        L.push(promptTarefa(plan, t));
        L.push('```');
        L.push('');
        L.push(`\`node ${plan.engine} tarefa ${plan.feature} ${t.id} done\` after the commit.`);
        L.push('');
      }
    }
    L.push('');
    L.push('5. **Final gate** (exit 0 or it isn\'t ready):');
    L.push('');
    L.push('```bash');
    L.push(`node ${plan.engine} verify ${plan.feature}`);
    L.push(`node ${plan.engine} audit --ci`);
    L.push('```');
    L.push('');
    L.push('6. **Monitoring (every ~1 min, while the agents work)**: warn BEFORE');
    L.push('   dispatching the agents that the work runs in background and that the full summary');
    L.push('   complete comes at the end. Mark each task in the ledger when an agent starts');
    L.push('   and when it finishes (that\'s what the table is made of):');
    L.push('');
    L.push('```bash');
    L.push(`node ${plan.engine} evento --run ${plan.runId} --tipo tarefa --tarefa <T-xxx> --faixa <faixa-N> --estado running`);
    L.push(`node ${plan.engine} evento --run ${plan.runId} --tipo tarefa --tarefa <T-xxx> --faixa <faixa-N> --estado done`);
    L.push('```');
    L.push('');
    L.push('   And every ~1 min post in the chat the progress TABLE + a short paragraph,');
    L.push('   recording the text in the ledger:');
    L.push('');
    L.push('```bash');
    L.push(`node ${plan.engine} resumo ${plan.feature} --tabela   # the table — paste in the chat`);
    L.push(`node ${plan.engine} resumo ${plan.feature} --gravar --origem ai --texto "<2 to 4 sentences of what is going on>"`);
    L.push('```');
  }
  L.push('');
  return `${L.join('\n')}\n`;
}
// ── artifact: executar-tarefas.sh (claude and codex) ────────────────────────
//
// The script is a DISPATCHER, not a linear script: each lane and each
// sequential task become functions, so you can re-run just what failed.
//
//   bash executar-tarefas.sh                  → everything (waves → sequentials → gate)
//   bash executar-tarefas.sh --faixa faixa-2  → just that lane (+ merge + gate)
//   bash executar-tarefas.sh --seq T-004      → just that sequential task
//   bash executar-tarefas.sh --gate           → only verify + audit
//   bash executar-tarefas.sh --listar         → what exists to execute
//
// Each task runs the agent's headless CLI with JSONL output:
//   claude → `claude -p --output-format stream-json --verbose`
//   codex  → `codex exec --json` (sandbox + --add-dir for the shared
//            worktrees' .git)
// The raw JSONL goes to the task's stream in the global ledger (tools,
// reasoning, outputs, cost) — that's where the summary gets the "last action".

const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

// 🔒 SECURITY: repository names, feature names and config values flow into the
// generated `executar-tarefas.sh`. Any `$(...)`, backtick, `;`, `"`, newline
// or space would be command-injected when the script runs. Render a shell-safe
// token (alnum, dot, underscore, hyphen) — real worktree/log paths and branch
// names never need anything else.
const shellTok = (s) => String(s).replace(/[^A-Za-z0-9._-]/g, '_');

// path with every segment shell-tokenized (used in prompts quoted into the script)
const baseDirPrompt = (plan) => plan.baseDir.split('/').map(shellTok).join('/');

function allowedTools(plan) {
  if (plan.cfg.allowedTools) return plan.cfg.allowedTools;
  const base = ['Bash(git add:*)', 'Bash(git commit:*)', 'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)'];
  if (plan.testCommand) base.push(`Bash(${plan.testCommand.split(/\s+/)[0]}:*)`);
  return base.join(',');
}

// bash function name from the lane id (faixa-1 → faixa_1)
const fn = (id) => id.replace(/-/g, '_');

export function renderPlanoSh(plan) {
  const L = [];
  const P = (...linhas) => L.push(...linhas);

  // 🔒 SECURITY: never interpolate raw project/feature/config strings into the
  // shell script — sanitize them at the render boundary (see shellTok).
  const repoName = shellTok(plan.repoName);
  const feature = shellTok(plan.feature);
  const permissionMode = shellTok(plan.cfg.permissionMode);
  const baseBranch = shellTok(plan.branchTrabalho);
  const baseDirShell = plan.baseDir.split('/').map(shellTok).join('/');

  P('#!/usr/bin/env bash');
  P(`# executar-tarefas.sh — generated by \`onp-spec plano ${feature}\` at ${plan.geradoEm}`);
  P('# do NOT edit by hand: changed tasks.md or the config, regenerate the plan.');
  P('#');
  P('# usage:');
  P('#   bash executar-tarefas.sh                  everything (waves → sequentials → gate)');
  P('#   bash executar-tarefas.sh --faixa <id>     re-runs ONE lane (+ merge + gate)');
  P('#   bash executar-tarefas.sh --seq <T-xxx>    re-runs ONE sequential task');
  P('#   bash executar-tarefas.sh --gate           only the gate (verify + audit)');
  P('#   bash executar-tarefas.sh --listar         shows lanes, tasks and states');
  P('#   (add --sem-gate to skip the gate at the end)');
  P('#');
  P(`# what is going on, at any time: onp-spec resumo ${feature}`);
  P('set -u');
  P('set -o pipefail');
  P('');
  const codex = plan.agent === 'codex';
  const cursor = plan.agent === 'cursor';
  const opencode = plan.agent === 'opencode';
  P(`RUN_ID=${shq(plan.runId)}`);
  P(`FEATURE=${shq(feature)}`);
  P(`BASE_BRANCH=${shq(baseBranch)}`);
  P(`ENGINE=${shq(plan.engine)}`);
  if (codex) {
    P(`CODEX_FLAGS=(--sandbox ${shq(plan.cfg.sandbox || 'workspace-write')})`);
    P('STREAM_FLAGS=(--json)');
  } else if (cursor) {
    P('# --force: without it Cursor\'s print mode only proposes changes (doesn\'t write).');
    P('# Fine control is the user\'s: permissions.deny in .cursor/cli.json WINS over --force.');
    P('CURSOR_FLAGS=(--force)');
    P('STREAM_FLAGS=(--output-format stream-json)');
  } else if (opencode) {
    P('# --auto approves permissions not explicitly denied — the executor must WRITE.');
    P('# Fine control is the user\'s: .opencode/opencode.json permission rules still win.');
    P('OPENCODE_FLAGS=(--auto)');
    P('STREAM_FLAGS=(--format json)');
  } else {
    P(`CLAUDE_FLAGS=(--permission-mode ${permissionMode} --allowedTools ${shq(allowedTools(plan))})`);
    P('STREAM_FLAGS=(--output-format stream-json --verbose)');
  }
  P('FALHAS=""');
  P('COM_GATE=1');
  P(`RESUMO_MODEL=${shq(resumoModelParaAgente(plan.cfg, plan.agent))}`);
  P('RESUMO_PID=""');
  P('');
  P(`verde()    { printf '\\033[32m%s\\033[0m\\n' "$*"; }`);
  P(`vermelho() { printf '\\033[31m%s\\033[0m\\n' "$*"; }`);
  P(`amarelo()  { printf '\\033[33m%s\\033[0m\\n' "$*"; }`);
  P(`info()     { printf '· %s\\n' "$*"; }`);
  P('falhar()   { vermelho "✘ $*"; exit 1; }');
  P('');
  P('# events go to the GLOBAL ledger (~/.onp-spec/painel/ledger.jsonl):');
  P('# one file for all projects, that\'s what onp-spec resumo reads');
  P('evento() { node "$ENGINE" evento --run "$RUN_ID" "$@" >/dev/null 2>&1 || true; }');
  P('');
  P('# ── environment (all modes pass through here) ─────────────────────────');
  P('preparar_ambiente() {');
  P('  command -v git >/dev/null 2>&1 || falhar "git not found"');
  P('  command -v node >/dev/null 2>&1 || falhar "node not found"');
  if (codex) {
    P('  command -v codex >/dev/null 2>&1 || falhar "Codex CLI (codex) not found — install it or follow the manual mode in plano-execucao.md"');
  } else if (cursor) {
    P('  # current binary of the Cursor CLI is `agent`; `cursor-agent` is the legacy name');
    P('  CURSOR_BIN=$(command -v agent || command -v cursor-agent) || falhar "Cursor CLI (agent) not found — install: curl https://cursor.com/install -fsS | bash"');
  } else if (opencode) {
    P('  command -v opencode >/dev/null 2>&1 || falhar "opencode CLI (opencode) not found — install it or follow the manual mode in plano-execucao.md"');
  } else {
    P('  command -v claude >/dev/null 2>&1 || falhar "Claude Code CLI (claude) not found — install it or follow the manual mode in plano-execucao.md"');
  }
  P('  TOPLEVEL=$(git rev-parse --show-toplevel 2>/dev/null) || falhar "outside a git repository"');
  P('  cd "$TOPLEVEL" || exit 1');
  P('  # artifacts freshly generated by `onp-spec plano` are expected dirt:');
  P('  # if they are the ONLY dirt, the script commits them itself; anything else, abort');
  P('  if [ -n "$(git status --porcelain)" ]; then');
  P(`    if [ -z "$(git status --porcelain | grep -v -e 'plano-execucao\\.' -e 'plano\\.json' -e 'executar-tarefas\\.sh')" ]; then`);
  P('      git add -A');
  P('      git commit -q -m "execution plan: $FEATURE (generated artifacts)"');
  P('      info "plan artifacts committed"');
  P('    else');
  P('      falhar "tree dirty beyond the plan artifacts — commit or git stash before (the worktrees start from the last commit)"');
  P('    fi');
  P('  fi');
  P(`  git ls-files --error-unmatch -- ${shq(`${baseDirShell}/spec.md`)} >/dev/null 2>&1 || falhar "spec.md is not committed — the lane worktrees need it in git"`);
  P('  ATUAL=$(git rev-parse --abbrev-ref HEAD)');
  P('  [ "$ATUAL" != "HEAD" ] || falhar "detached HEAD — switch to a branch"');
  P('  if [ "$ATUAL" != "$BASE_BRANCH" ]; then');
  P('    if git show-ref --verify --quiet "refs/heads/$BASE_BRANCH"; then');
  P('      git checkout -q "$BASE_BRANCH" || falhar "could not switch to $BASE_BRANCH"');
  P('    else');
  P('      git checkout -q -b "$BASE_BRANCH" || falhar "could not create $BASE_BRANCH"');
  P('    fi');
  P('    info "work branch: $BASE_BRANCH (from $ATUAL)"');
  P('  fi');
  P('  git worktree prune');
  P(`  LOG_DIR="$(dirname "$TOPLEVEL")/onp-worktrees/${repoName}-${feature}-logs"`);
  P(`  WT_BASE="$(dirname "$TOPLEVEL")/onp-worktrees/${repoName}-${feature}"`);
  P('  STREAMS_DIR="${ONP_SPEC_HOME:-$HOME/.onp-spec}/painel/streams/$RUN_ID"');
  P('  mkdir -p "$LOG_DIR" "$STREAMS_DIR"');
  P('}');
  P('');
  P('# clean worktree even after a failed attempt');
  P('preparar_worktree() { # $1=lane $2=branch $3=worktree');
  P('  git worktree prune');
  P('  if [ -e "$3" ]; then git worktree remove --force "$3" >/dev/null 2>&1; rm -rf "$3"; fi');
  P('  if git show-ref --verify --quiet "refs/heads/$2"; then git branch -D "$2" >/dev/null 2>&1; fi');
  P('  git worktree add "$3" -b "$2" >/dev/null 2>&1 || { vermelho "✘ could not create the worktree of $1 at $3"; return 1; }');
  P('}');
  P('');
  P('tentativa() { # $1=lane — counts re-runs (goes to the ledger)');
  P('  local arq="$LOG_DIR/.tentativa-$1"');
  P('  local n=1');
  P('  [ -f "$arq" ] && n=$(( $(cat "$arq") + 1 ))');
  P('  printf "%s" "$n" > "$arq"');
  P('  printf "%s" "$n"');
  P('}');
  P('');
  P(`# one task = one ${codex ? 'codex exec' : cursor ? 'agent (Cursor)' : opencode ? 'opencode run' : 'claude'} headless session with clean context.`);
  P('# the session\'s JSONL becomes the task\'s stream in the ledger');
  P('rodar_tarefa() { # $1=scope(lane|seq) $2=T-xxx $3=prompt $4=model $5=effort');
  P('  local chave="$1--$2"');
  P('  local stream="$STREAMS_DIR/$chave.jsonl"');
  P('  evento --tipo tarefa --tarefa "$2" --faixa "$1" --estado running --stream "$chave"');
  if (codex) {
    P('  info "$2 — codex exec ($4 · $5) · stream: $chave"');
    P('  # --add-dir: the shared worktrees\' .git lives in the main repo —');
    P('  # without it the workspace-write sandbox would block the task\'s commit');
    P('  if codex exec "$3" --model "$4" -c model_reasoning_effort="$5" "${STREAM_FLAGS[@]}" "${CODEX_FLAGS[@]}" --add-dir "$TOPLEVEL" > "$stream" 2>>"$LOG_DIR/$1.log"; then');
  } else if (cursor) {
    P('  info "$2 — agent -p ($4) · stream: $chave"');
    P('  # $5 (effort) does NOT become a flag: the Cursor CLI has no reasoning effort —');
    P('  # the level goes embedded in the model slug (e.g.: gpt-5.6-terra-high)');
    P('  if "$CURSOR_BIN" -p "$3" --model "$4" "${STREAM_FLAGS[@]}" "${CURSOR_FLAGS[@]}" > "$stream" 2>>"$LOG_DIR/$1.log"; then');
  } else if (opencode) {
    P('  info "$2 — opencode run ($4 · $5) · stream: $chave"');
    P('  # effort → --variant (reasoning depth); opencode has no "max", codex-like');
    P('  # the worked tree is the CWD, so opencode writes where the task expects');
    P('  if opencode run "$3" --model "$4" --variant "$5" "${STREAM_FLAGS[@]}" "${OPENCODE_FLAGS[@]}" > "$stream" 2>>"$LOG_DIR/$1.log"; then');
  } else {
    P('  info "$2 — claude -p ($4 · $5) · stream: $chave"');
    P('  if claude -p "$3" --model "$4" --effort "$5" "${STREAM_FLAGS[@]}" "${CLAUDE_FLAGS[@]}" > "$stream" 2>>"$LOG_DIR/$1.log"; then');
  }
  P('    evento --tipo tarefa --tarefa "$2" --faixa "$1" --estado done --stream "$chave"');
  P('    node "$ENGINE" stream-resumo "$RUN_ID" "$chave" 2>/dev/null || true');
  P('    return 0');
  P('  fi');
  P('  evento --tipo tarefa --tarefa "$2" --faixa "$1" --estado failed --stream "$chave"');
  P('  node "$ENGINE" stream-resumo "$RUN_ID" "$chave" 2>/dev/null || true');
  P('  return 1');
  P('}');
  P('');
  P('mesclar_faixa() { # $1=lane $2=branch $3=worktree $4=lane-exit');
  P('  if [ "$4" -ne 0 ]; then');
  P('    evento --tipo faixa --faixa "$1" --estado failed');
  P('    vermelho "✘ $1 failed (log: $LOG_DIR/$1.log) — worktree kept for inspection: $3"');
  P(`    amarelo "  re-run only it: bash ${baseDirShell}/executar-tarefas.sh --faixa $1"`);
  P('    FALHAS="$FALHAS $1"; return 1');
  P('  fi');
  P('  evento --tipo faixa --faixa "$1" --estado merging');
  P('  if git merge --no-ff "$2" -m "merge $1 ($FEATURE)"; then');
  P('    git worktree remove --force "$3" >/dev/null 2>&1');
  P('    git branch -d "$2" >/dev/null 2>&1');
  P('    evento --tipo faixa --faixa "$1" --estado merged');
  P('    verde "✔ $1 merged into $BASE_BRANCH"');
  P('  else');
  P('    git merge --abort >/dev/null 2>&1');
  P('    evento --tipo faixa --faixa "$1" --estado conflict');
  P('    vermelho "✘ conflict merging $1 — resolve by hand: git merge $2 (worktree kept: $3)"');
  P('    FALHAS="$FALHAS $1"; return 1');
  P('  fi');
  P('}');
  P('');
  P('marcar_concluidas() { # $@=T-xxx');
  P('  for t in "$@"; do node "$ENGINE" tarefa "$FEATURE" "$t" done >/dev/null || true; done');
  P('}');
  P('');
  P('# ── general progress summary: 1/min while the execution runs ──────────');
  P(
    `# written by AI (${codex ? 'codex exec read-only' : cursor ? 'agent -p without --force, read-only' : opencode ? 'opencode run without --auto, read-only' : 'claude -p, no tools'}) with engine fallback; goes`
  );
  P('# to the terminal and to the ledger — the agent relays the text in the chat.');
  P('gerar_resumo() {');
  P('  local ctx ia');
  P('  ctx=$(node "$ENGINE" resumo "$FEATURE" --contexto 2>/dev/null) || ctx=""');
  P('  [ -n "$ctx" ] || return 0');
  P(
    `  ia=$(${codex ? 'codex exec' : cursor ? '"$CURSOR_BIN" -p' : opencode ? 'opencode run' : 'claude -p'} "You narrate, for the product owner, a running execution of coding tasks. Mechanical state:`
  );
  P('');
  P('$ctx');
  P('');
  P(
    `Write the GENERAL PROGRESS SUMMARY: a single paragraph of 2 to 4 sentences, in plain English, saying what is happening now, what already finished, what failed and whether the user needs to act. No markdown, no lists." --model "$RESUMO_MODEL"${codex ? ' --sandbox read-only --ephemeral' : opencode ? ' --format default' : ''} 2>/dev/null)`
  );
  P('  if [ -n "$ia" ]; then');
  P('    node "$ENGINE" resumo "$FEATURE" --gravar --origem ai --texto "$ia" >/dev/null 2>&1 || true');
  P(`    printf '\\n📣 summary (AI): %s\\n' "$ia"`);
  P('  else');
  P('    node "$ENGINE" resumo "$FEATURE" --gravar >/dev/null 2>&1 || true');
  P(`    printf '\\n📣 summary: %s\\n' "$(node "$ENGINE" resumo "$FEATURE" 2>/dev/null)"`);
  P('  fi');
  P('}');
  P('');
  P('# kills the loop AND the child sleep — otherwise the sleep inherits stdout and whoever');
  P('# called the script via pipe waits for EOF up to 60s after the exit');
  P('parar_resumos() {');
  P('  [ -n "$RESUMO_PID" ] || return 0');
  P('  command -v pkill >/dev/null 2>&1 && pkill -P "$RESUMO_PID" 2>/dev/null');
  P('  kill "$RESUMO_PID" 2>/dev/null');
  P('  RESUMO_PID=""');
  P('}');
  P('');
  P('iniciar_resumos() {');
  P('  ( while :; do sleep 60; gerar_resumo; done ) &');
  P('  RESUMO_PID=$!');
  P('  # on exit: stop the loop and record a last summary (the final state, by the engine)');
  P(`  trap 'parar_resumos; node "$ENGINE" resumo "$FEATURE" --gravar >/dev/null 2>&1 || true' EXIT`);
  P('}');

  // ── one function per lane ────────────────────────────────────────────────
  for (const fx of plan.faixas) {
    const ids = fx.tasks.map((t) => t.id).join(' ');
    P('');
    P(`# ── ${fx.id}: ${ids} ──`);
    P(`executar_${fn(fx.id)}() {`);
    P(`  local WT="$WT_BASE-${fx.id}"`);
    P(`  preparar_worktree ${shq(fx.id)} ${shq(fx.branch)} "$WT" || return 1`);
    P(`  evento --tipo faixa --faixa ${shq(fx.id)} --estado running --tentativa "$(tentativa ${shq(fx.id)})"`);
    P(`  : > "$LOG_DIR/${fx.id}.log"`);
    P('  (');
    P('    cd "$WT" || exit 9');
    fx.tasks.forEach((t, i) => {
      const cont = i < fx.tasks.length - 1 ? ' &&' : '';
      P(`    rodar_tarefa ${shq(fx.id)} ${shq(t.id)} ${shq(promptTarefa(plan, t))} ${shq(t.model)} ${t.esforcoCli}${cont}`);
    });
    P(`  ) >> "$LOG_DIR/${fx.id}.log" 2>&1`);
    P('  local st=$?');
    P(`  mesclar_faixa ${shq(fx.id)} ${shq(fx.branch)} "$WT" "$st" || return 1`);
    P(`  marcar_concluidas ${ids}`);
    P('  return 0');
    P('}');
  }

  // ── one function per sequential task ────────────────────────────────────
  for (const t of plan.sequenciais) {
    P('');
    P(`# ── sequential ${t.id} (${(t.motivoSeq || 'tasks.md order').replace(/`/g, '')}) ──`);
    P(`executar_seq_${fn(t.id)}() {`);
    P(`  info ${shq(`sequential ${t.id} — ${t.title}`)}`);
    P(`  if rodar_tarefa seq ${shq(t.id)} ${shq(promptTarefa(plan, t))} ${shq(t.model)} ${t.esforcoCli} >> "$LOG_DIR/seq.log" 2>&1; then`);
    P('    # safety commit if the agent forgot (traceability > perfection)');
    P('    if [ -n "$(git status --porcelain)" ]; then');
    P(`      git add -A && git commit -q -m ${shq(`${t.id} ${feature}: ${t.title} (plan auto-commit)`)}`);
    P('    fi');
    P(`    marcar_concluidas ${t.id}`);
    P(`    verde "✔ ${t.id} done"`);
    P('    return 0');
    P('  fi');
    P(`  vermelho "✘ ${t.id} failed (log: $LOG_DIR/seq.log)"`);
    P(`  amarelo "  re-run only it: bash ${baseDirShell}/executar-tarefas.sh --seq ${t.id}"`);
    P(`  FALHAS="$FALHAS ${t.id}"`);
    P('  return 1');
    P('}');
  }

  // ── gate ────────────────────────────────────────────────────────────────
  P('');
  P('# ── gate: the machine decides ─────────────────────────────────────────');
  P('rodar_gate() {');
  P('  echo');
  P('  info "gate: verify + audit --ci"');
  P('  evento --tipo gate --etapa start');
  P('  node "$ENGINE" verify "$FEATURE"');
  P('  local v=$?');
  P('  evento --tipo gate --etapa verify --exit "$v"');
  P('  node "$ENGINE" audit --ci');
  P('  AUDIT=$?');
  P('  evento --tipo gate --etapa audit --exit "$AUDIT"');
  P('  # closes the accounting: task statuses + verify proof in git');
  P(`  if [ -n "$(git status --porcelain -- ${shq(plan.specDir)})" ]; then`);
  P(`    git add -A -- ${shq(plan.specDir)}`);
  P('    git commit -q -m "$FEATURE: task statuses + verify proof (plan)"');
  P('    info "task statuses and verify proof committed"');
  P('  fi');
  P('  return "$AUDIT"');
  P('}');
  P('');
  P('encerrar() { # $1=scope');
  P('  echo');
  P('  if [ -n "$FALHAS" ]; then vermelho "lanes/tasks with failure:$FALHAS"; fi');
  P('  # without the gate there is no verdict: NEVER announce alignment without the audit');
  P('  if [ "$COM_GATE" -eq 0 ]; then');
  P('    evento --tipo end --exit 1 --escopo "$1"');
  P('    if [ -z "$FALHAS" ]; then');
  P('      amarelo "○ \'$1\' work finished WITHOUT the gate (--sem-gate) — this is NOT proof of anything"');
  P(`      amarelo "  for the verdict: bash ${baseDirShell}/executar-tarefas.sh --gate"`);
  P('      exit 0');
  P('    fi');
  P('    vermelho "and there are still failures — fix them and run the gate"');
  P('    exit 1');
  P('  fi');
  P('  rodar_gate');
  P('  local audit=$?');
  P('  if [ "$audit" -eq 0 ] && [ -z "$FALHAS" ]; then');
  P('    evento --tipo end --exit 0 --escopo "$1"');
  P('    verde "✔ plan completed — spec and code aligned (audit exit 0) on branch $BASE_BRANCH"');
  P('    info "next step: review and merge to main when you want (git merge $BASE_BRANCH)"');
  P('    exit 0');
  P('  fi');
  P('  evento --tipo end --exit 1 --escopo "$1"');
  P('  vermelho "plan finished with pending items — read the audit output above and the logs in $LOG_DIR"');
  P('  amarelo "tip: re-run just what failed (--faixa <id> / --seq <T-xxx>)"');
  P('  exit 1');
  P('}');

  // ── mode: everything ────────────────────────────────────────────────────
  P('');
  P('executar_tudo() {');
  P('  evento --tipo start --escopo all');
  P('  iniciar_resumos');
  P('  info "logs in: $LOG_DIR"');
  P('  info "general progress summary: every 1 min here in the terminal (and via: onp-spec resumo)"');
  plan.ondas.forEach((onda, oi) => {
    P(`  # wave ${oi + 1}: ${onda.map((fx) => fx.id).join(' ∥ ')}`);
    P(`  info "wave ${oi + 1}: ${onda.map((fx) => fx.id).join(' ∥ ')} — clean windows in parallel"`);
    for (const fx of onda) {
      P(`  executar_${fn(fx.id)} & PID_${fn(fx.id).toUpperCase()}=$!`);
    }
    for (const fx of onda) {
      P(`  wait "$PID_${fn(fx.id).toUpperCase()}" || true`);
    }
  });
  for (const t of plan.sequenciais) P(`  executar_seq_${fn(t.id)} || true`);
  P('  encerrar all');
  P('}');

  // ── dispatcher ──────────────────────────────────────────────────────────
  P('');
  P('listar() {');
  P(`  echo "execution: $RUN_ID (feature $FEATURE, branch $BASE_BRANCH)"`);
  plan.ondas.forEach((onda, oi) => {
    for (const fx of onda) {
      P(`  echo "  ${fx.id}  wave ${oi + 1}  ${fx.tasks.map((t) => t.id).join(', ')}"`);
    }
  });
  for (const t of plan.sequenciais) P(`  echo "  seq       ${t.id} (sequential)"`);
  P('  echo');
  P('  echo "re-run a lane:       --faixa <id>"');
  P('  echo "re-run sequential:   --seq <T-xxx>"');
  P('  echo "only the gate:       --gate"');
  P('}');
  P('');
  P('MODO="tudo"');
  P('ALVO=""');
  P('while [ $# -gt 0 ]; do');
  P('  case "$1" in');
  P('    --listar) MODO="listar" ;;');
  P('    --gate) MODO="gate" ;;');
  P('    --sem-gate) COM_GATE=0 ;;');
  P('    --faixa) MODO="faixa"; ALVO="${2:-}"; shift ;;');
  P('    --seq) MODO="seq"; ALVO="${2:-}"; shift ;;');
  P('    -h|--help) sed -n "2,14p" "$0"; exit 0 ;;');
  P('    *) vermelho "unknown argument: $1"; sed -n "2,14p" "$0"; exit 2 ;;');
  P('  esac');
  P('  shift');
  P('done');
  P('');
  P('if [ "$MODO" = "listar" ]; then listar; exit 0; fi');
  P('');
  P('preparar_ambiente');
  P('');
  P('case "$MODO" in');
  P('  tudo) executar_tudo ;;');
  P('  gate) COM_GATE=1; iniciar_resumos; encerrar gate ;;');
  P('  faixa)');
  P('    case "$ALVO" in');
  for (const fx of plan.faixas) {
    P(`      ${fx.id}) evento --tipo start --escopo "faixa:${fx.id}"; iniciar_resumos; executar_${fn(fx.id)} || true; encerrar "faixa:${fx.id}" ;;`);
  }
  P('      *) falhar "unknown lane: \'$ALVO\' — see the available ones with --listar" ;;');
  P('    esac ;;');
  P('  seq)');
  P('    case "$ALVO" in');
  for (const t of plan.sequenciais) {
    P(`      ${t.id}) evento --tipo start --escopo "seq:${t.id}"; iniciar_resumos; executar_seq_${fn(t.id)} || true; encerrar "seq:${t.id}" ;;`);
  }
  P(`      *) falhar "unknown sequential task: '$ALVO' — see the available ones with --listar" ;;`);
  P('    esac ;;');
  P('esac');

  return `${L.join('\n')}\n`;
}
// ── artifact: plano-execucao.html (claude only) ────────────────────────────

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderPlanoHtml(plan) {
  const cmd = `bash ${plan.baseDir}/executar-tarefas.sh`;
  const paralelas = plan.faixas.reduce((n, fx) => n + fx.tasks.length, 0);
  const sequencial = plan.modo === 'sequencial';
  const codexHtml = plan.agent === 'codex';
  const cursorHtml = plan.agent === 'cursor';
  const opencodeHtml = plan.agent === 'opencode';
  const agenteRotulo = codexHtml ? 'Codex' : cursorHtml ? 'Cursor' : opencodeHtml ? 'opencode' : 'Claude Code';
  const cliRotulo = codexHtml
    ? '<code>codex exec</code>'
    : cursorHtml
      ? '<code>agent -p</code> (Cursor CLI)'
      : opencodeHtml
        ? '<code>opencode run</code>'
        : '<code>claude -p</code>';
  const card = (t) => `
        <div class="tarefa">
          <span class="tid">${esc(t.id)}</span>
          <span class="ttitulo">${esc(t.title)}</span>
          <span class="meta"><code>${esc(t.model)}</code> · effort <b>${esc(t.esforcoCli)}</b></span>
          <span class="arquivos">${t.files.map((f) => `<code>${esc(f)}</code>`).join(' ') || `<em>${esc((t.motivoSeq || 'no files — sequential').replace(/`/g, ''))}</em>`}</span>
        </div>`;
  const faixaHtml = (fx) => `
      <div class="faixa">
        <h4>${esc(fx.id)} <small>branch <code>${esc(fx.branch)}</code> · worktree <code>${esc(fx.worktree)}</code></small></h4>
        ${fx.tasks.map(card).join('')}
      </div>`;
  const ondasHtml = plan.ondas
    .map(
      (onda, i) => `
    <section class="onda">
      <h3>Wave ${i + 1} <small>${onda.map((fx) => esc(fx.id)).join(' ∥ ')} — in parallel, clean windows</small></h3>
      <div class="grade">${onda.map(faixaHtml).join('')}</div>
    </section>`
    )
    .join('');
  const seqHtml = plan.sequenciais.length
    ? `
    <section class="onda">
      <h3>${sequencial ? 'Execution order <small>one task after another, on the main tree</small>' : 'Sequentials <small>after the waves, on the main tree</small>'}</h3>
      <div class="grade"><div class="faixa">${plan.sequenciais.map(card).join('')}</div></div>
    </section>`
    : '';
  const avisosHtml = plan.avisos.length
    ? `<div class="avisos">${plan.avisos.map((a) => `<div>⚠ ${esc(a)}</div>`).join('')}</div>`
    : '';

  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Execution plan — ${esc(plan.feature)}</title>
<style>
  :root { --bg:#fafafa; --fg:#1a1a1a; --card:#fff; --borda:#e2e2e2; --sub:#666;
          --acc:#0a7c42; --acc-fg:#fff; --aviso:#8a6d00; --aviso-bg:#fff8e1; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#141414; --fg:#eaeaea; --card:#1e1e1e; --borda:#333; --sub:#9a9a9a;
            --acc:#17a35c; --aviso:#e0c36a; --aviso-bg:#2a2410; }
  }
  * { box-sizing:border-box }
  body { margin:0; padding:2rem 1rem; background:var(--bg); color:var(--fg);
         font:15px/1.55 system-ui,-apple-system,sans-serif }
  main { max-width:64rem; margin:0 auto }
  h1 { font-size:1.5rem; margin:0 0 .25rem } h3 { margin:1.5rem 0 .5rem }
  h4 { margin:0 0 .5rem } small { color:var(--sub); font-weight:400 }
  .sub { color:var(--sub); margin:0 0 1.25rem }
  code { font:.85em ui-monospace,monospace; background:var(--card);
         border:1px solid var(--borda); border-radius:4px; padding:.05em .35em; overflow-wrap:anywhere }
  .resumo { display:flex; gap:.75rem; flex-wrap:wrap; margin:0 0 1rem }
  .resumo div { background:var(--card); border:1px solid var(--borda); border-radius:8px;
                padding:.5rem .9rem } .resumo b { font-size:1.2rem }
  .executor { background:var(--card); border:1px solid var(--borda); border-radius:10px;
              padding:1rem; margin:0 0 .5rem }
  .executor h2 { margin:0 0 .5rem; font-size:1.05rem }
  .nota { color:var(--sub); font-size:.85rem; margin:.5rem 0 0 }
  #cmd { display:inline-block; margin-top:.6rem }
  .grade { display:grid; grid-template-columns:repeat(auto-fit,minmax(17rem,1fr)); gap:.75rem }
  .faixa { background:var(--card); border:1px solid var(--borda); border-radius:10px; padding: .9rem }
  .tarefa { display:flex; flex-direction:column; gap:.15rem; padding:.6rem 0;
            border-top:1px dashed var(--borda) }
  .tarefa:first-of-type { border-top:0 }
  .tid { font:700 .85rem ui-monospace,monospace; color:var(--acc) }
  .meta,.arquivos { font-size:.85rem; color:var(--sub) }
  .avisos { background:var(--aviso-bg); color:var(--aviso); border-radius:8px;
            padding:.6rem .9rem; margin:0 0 1rem; font-size:.9rem }
  ol li { margin:.25rem 0 }
</style>
<main>
  <h1>Execution plan — ${esc(plan.feature)}</h1>
  <p class="sub">generated by <code>onp-spec plano</code> at ${esc(plan.geradoEm)} · regenerate after changing tasks.md</p>
  <div class="resumo">
    ${
      sequencial
        ? `<div><b>${plan.sequenciais.length}</b> task(s), one after another</div>
    <div>mode <b>sequential</b> (user's choice)</div>`
        : `<div><b>${paralelas}</b> task(s) in parallel</div>
    <div><b>${plan.faixas.length}</b> lane(s) · <b>${plan.ondas.length}</b> wave(s)</div>
    <div><b>${plan.sequenciais.length}</b> sequential</div>${
      plan.paralelizar ? `\n    <div>user's selection: <b>${plan.paralelizar.map(esc).join(', ')}</b></div>` : ''
    }`
    }
    <div>branch <code>${esc(plan.branchTrabalho)}</code></div>
  </div>
  ${avisosHtml}
  <div class="executor">
    <h2>How to execute — via agent</h2>
    <p>Ask the agent (${agenteRotulo}) to execute the plan. It runs:</p>
    <div><code id="cmd">${esc(cmd)}</code></div>
    <p class="nota">This file is just visualization. ${
      sequencial
        ? `Each task runs ${cliRotulo} on the main tree, one after another, with clean context and model/effort already set.`
        : `Each lane runs ${cliRotulo} in its own worktree, with clean context, model and effort already set.`
    }
    The final gate (verify + audit) runs by itself; the execution stays in background and, every
    1 minute, the agent posts in the chat the <b>progress table</b>
    (<code>onp-spec resumo ${esc(plan.feature)} --tabela</code>) and the
    <b>general progress summary</b> (<code>onp-spec resumo ${esc(plan.feature)}</code>).</p>
  </div>
  ${ondasHtml}
  ${seqHtml}
  <section class="onda">
    <h3>Branches and commits</h3>
    <ol>
      <li>everything starts from the work branch <code>${esc(plan.branchTrabalho)}</code></li>
      ${
        sequencial
          ? `<li>the tasks run on it, in order; 1 task = 1 commit <code>T-xxx ${esc(plan.feature)}: title</code></li>`
          : `<li>1 lane = 1 branch + 1 worktree; 1 task = 1 commit <code>T-xxx ${esc(plan.feature)}: title</code></li>
      <li>merge <code>--no-ff</code> per lane, in order; conflict stops and asks you</li>`
      }
      <li>final gate: <code>onp-spec verify ${esc(plan.feature)}</code> + <code>onp-spec audit --ci</code> — exit 0 or it isn't ready</li>
    </ol>
  </section>
</main>
`;
}
