// onp-spec CLI — command dispatch.

import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, chmodSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  montarPlano,
  renderPlanoMd,
  renderPlanoSh,
  renderPlanoHtml,
  renderPlanoJson,
  usaExecutorSh,
  normalizarEsforco,
  AGENTES,
} from './core/plano.js';
import { registrarEvento, podarLedger, lerStream, lerEventos, montarArvore } from './core/ledger.js';
import {
  resumoDeterministico,
  contextoParaIa,
  montarResumoAtual,
  registrarResumo,
  execucaoAlvo,
  tabelaAndamento,
} from './core/resumo.js';
import { TASK_STATUSES } from './parsers/tasks.js';
import { DASH, foldStatus } from './util/text.js';
import { loadConfig, DEFAULT_CONFIG } from './config.js';
import { loadProject } from './core/project.js';
import { auditProject } from './core/audit.js';
import { renderTerminal, renderJson, renderMarkdown } from './core/report.js';
import { runVerify, gitRev } from './core/verify.js';
import { scaffoldTests } from './core/scaffold.js';
import { allAcs } from './parsers/spec.js';
import { carregarSinais, registrarAchados, registrarVerify } from './core/sinais.js';
import {
  carregarLicoes,
  salvarLicoes,
  adicionarLicao,
  listarLicoes,
  penalizarLicao,
  podarLicoes,
  sugerirLicoes,
  LICOES_DEFAULTS,
} from './core/licoes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// Where the skill lives: repo layout (skills/onp-spec-driven) or embedded
// layout (this file at <skill>/scripts/lib/src → the skill is ../../..).
// The embedded fallback only counts if the found SKILL.md belongs to the
// requested agent (marker `agent:` in the frontmatter) — otherwise we'd
// install the wrong skill while announcing success.
function skillAgentMarker(dir) {
  try {
    const conteudo = readFileSync(path.join(dir, 'SKILL.md'), 'utf-8');
    const frontmatter = conteudo.split(/^---\s*$/m)[1] || '';
    const m = frontmatter.match(/^\s*agent:\s*(\S+)/m);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

const SKILL_DIR_POR_AGENTE = {
  claude: 'onp-spec-driven',
  antigravity: 'onp-spec-driven-antigravity',
  codex: 'onp-spec-driven-codex',
  cursor: 'onp-spec-driven-cursor',
  opencode: 'onp-spec-driven-opencode',
};

// skills directory each agent reads INSIDE the project (the installed skill
// folder name is always onp-spec-driven — in Cursor the frontmatter `name:`
// MUST match the folder name)
const SKILLS_DIR_PROJETO = {
  claude: '.claude',
  antigravity: '.agents',
  codex: '.agents',
  cursor: '.cursor',
  opencode: '.opencode',
};

function resolveSkillDir(agent = 'claude') {
  const dirName = SKILL_DIR_POR_AGENTE[agent] || 'onp-spec-driven';
  const candidates = [
    path.join(__dirname, '..', 'skills', dirName),
    path.join(__dirname, '..', '..', '..'),
  ];
  for (const dir of candidates) {
    if (!existsSync(path.join(dir, 'SKILL.md'))) continue;
    const marker = skillAgentMarker(dir);
    if (marker && marker !== agent) continue; // another agent's skill — not for us
    return dir;
  }
  return null;
}

const HELP = `onp-spec — spec-anchored development (the specification that stays true)

usage: onp-spec <command> [options]

commands:
  init [--preset base|lgpd-educacao] [--agents claude|antigravity|codex|cursor|opencode]
                      creates .spec/, constitution and config in the current
                      directory (--agents also installs the chosen agent's skill)
  new <feature>       creates .spec/features/<feature>/ with spec.md and tasks.md
  plano <feature> [--agents claude|antigravity|codex|cursor|opencode] [--paralelizar T-xxx,T-yyy]
                  [--sequencial] [--modelo <model>] [--esforco <level>]
                      execution plan. Default: groups tasks into PARALLEL lanes
                      (disjoint files → 1 worktree + 1 branch +
                      1 clean window per lane). With --paralelizar: only the
                      CHOSEN tasks join the lanes (the rest run one after
                      another, at the end). With --sequencial: everything runs
                      one task after another, on the main tree. WHICH tasks to
                      parallelize is the USER's choice (the agent asks before
                      executing).
                      · always: plano-execucao.md (lanes/order, branches,
                        commits) + plano.json
                      · claude: executar-tarefas.sh (claude -p headless with
                        --model/--effort per task and a progress summary every
                        1 min in the terminal) + plano-execucao.html (visual)
                      · codex: executar-tarefas.sh (codex exec headless with
                        --json, sandbox and --model/model_reasoning_effort per
                        task) + plano-execucao.html (visual)
                      · cursor: executar-tarefas.sh (headless Cursor CLI:
                        agent -p with --model per task, stream-json and
                        --force; effort goes into the model slug) +
                        plano-execucao.html (visual)
                      · opencode: executar-tarefas.sh (opencode run headless
                        with --model (provider/model) and --variant per task,
                        --format json and --auto) + plano-execucao.html (visual)
                      · antigravity: ready-made prompts for the native agents
                        (no CLI dependency at all)
                      Cost is the USER's choice: --modelo/--esforco lock the
                      model and effort of ALL tasks (they override tasks.md
                      and config) — the agent confirms models/efforts with the
                      user BEFORE executing
  resumo [feature] [--tabela] [--global] [--run <runId>]
         [--gravar [--texto "..."] [--origem ai|engine]]
                      the GENERAL PROGRESS SUMMARY as text: what is running
                      right now, what finished, what failed. It is the text
                      the agent posts to the chat about every ~1 min while an
                      execution is running. --tabela prints the progress TABLE
                      in markdown (one row per task: where it runs, status and
                      last action) — ready to paste into the chat along with
                      the text. --gravar records it in the ledger (with
                      --texto, the AI/agent is writing; without it, the
                      engine's version is used).
  tarefa <feature> <T-xxx> [status] [--modelo <model>] [--esforco <level>]
                      updates the task in tasks.md: status (pending |
                      in-progress | done) and/or its cost (--modelo and
                      --esforco set Model:/Effort: — regenerate the plan
                      afterwards)
  audit [--ci] [--json] [--md <file>]
                      audits spec ↔ tasks ↔ tests ↔ code ↔ constitution
                      exits 1 on any error (use in CI)
  verify <feature>    runs the tests and records the proof for each acceptance
                      criterion (the test runner decides)
  scaffold <feature> [--force]
                      generates a (failing) test skeleton for each acceptance
                      criterion that still has no test
  status              overview: features, proven criteria, assumptions and
                      open questions
  assumptions         lists all assumptions and questions with status
  licoes <add|list|sugerir|penalizar|status>
                      lessons learned WITH BACKING: only a lesson anchored in
                      a real audit/verify signal gets in; mechanical promotion
                      when it recurs in distinct features (details: onp-spec licoes)
  help                this help

typical flow:
  onp-spec init --preset lgpd-educacao
  onp-spec new entrega-dever-casa      # write stories, criteria, assumptions and questions
  onp-spec scaffold entrega-dever-casa # each criterion becomes a failing test
  onp-spec plano entrega-dever-casa    # tasks in parallel lanes + execution artifacts
  ... run the plan (or implement by hand) until the tests pass ...
  onp-spec verify entrega-dever-casa   # the test runner records the proof
  onp-spec audit --ci                  # 0 = spec and code aligned`;

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

function template(name) {
  return readFileSync(path.join(TEMPLATES_DIR, name), 'utf-8');
}

function fill(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function cmdInit(rootDir, flags) {
  const preset = flags.preset || 'base';
  const presetFile = `constituicao-${preset}.md`;
  if (!existsSync(path.join(TEMPLATES_DIR, presetFile))) {
    console.error(`unknown preset: ${preset} (use: base, lgpd-educacao)`);
    return 2;
  }

  const specRoot = path.join(rootDir, '.spec');
  mkdirSync(path.join(specRoot, 'features'), { recursive: true });
  mkdirSync(path.join(specRoot, 'verification'), { recursive: true });

  const constitutionPath = path.join(specRoot, 'constituicao.md');
  if (existsSync(constitutionPath)) {
    console.log('· .spec/constituicao.md already exists — kept');
  } else {
    writeFileSync(constitutionPath, template(presetFile));
    console.log(`✔ .spec/constituicao.md created (preset: ${preset})`);
  }

  const configPath = path.join(rootDir, 'onpspec.config.json');
  if (existsSync(configPath)) {
    console.log('· onpspec.config.json already exists — kept');
  } else {
    const cfg = {
      testCommand: 'node --test --test-reporter=tap',
      reporter: 'tap',
      testGlobs: DEFAULT_CONFIG.testGlobs,
      srcGlobs: DEFAULT_CONFIG.srcGlobs,
    };
    writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`);
    console.log('✔ onpspec.config.json created (testCommand: "node --test --test-reporter=tap" — adjust to your stack)');
  }

  const gitignorePath = path.join(specRoot, 'verification', '.gitkeep');
  if (!existsSync(gitignorePath)) writeFileSync(gitignorePath, '');

  if (flags.agents !== undefined) {
    const agent = flags.agents === true ? 'claude' : flags.agents;
    if (!AGENTES.includes(agent)) {
      console.error(`unknown --agents: "${flags.agents}" (use: ${AGENTES.join(', ')})`);
      return 2;
    }
    const rotulo = { claude: 'Claude Code', antigravity: 'Antigravity', codex: 'Codex', cursor: 'Cursor', opencode: 'opencode' }[agent];
    // Each agent reads its skills directory inside the project (.claude, .cursor);
    // Codex and Antigravity read the SAME one (.agents/skills — the cross-agent
    // convention Codex adopts). The frontmatter `agent:` marker says who owns the
    // installed skill.
    const destRel = path.join(SKILLS_DIR_PROJETO[agent], 'skills', 'onp-spec-driven');
    const dest = path.join(rootDir, destRel);
    const skillDir = resolveSkillDir(agent);
    const marcadorExistente = skillAgentMarker(dest);
    if (marcadorExistente && marcadorExistente !== agent) {
      const nota =
        SKILLS_DIR_PROJETO[agent] === '.agents' ? ' — Codex and Antigravity share this directory.' : '.';
      console.error(
        `✘ ${destRel} already contains the skill for agent "${marcadorExistente}"${nota}\n` +
          `  To switch agents, remove the folder first: rm -rf ${destRel}`
      );
      return 2;
    }
    if (!skillDir) {
      console.log(
        `· skill for ${rotulo} not found bundled with this engine — install with: npx @onovoprogramador/onp-spec init --agents ${agent}`
      );
    } else if (path.resolve(dest) === path.resolve(skillDir)) {
      console.log(`· skill already installed at ${destRel} — kept`);
    } else {
      copyDirIfExists(skillDir, dest);
      console.log(`✔ skill installed at ${destRel} (${rotulo})`);
    }
    // Cursor reads .cursor/skills AND .agents/skills natively (and .claude/
    // .codex for compatibility) — two variants in the same project = two
    // skills with the SAME name, and Cursor may load the wrong one
    if (agent === 'cursor') {
      for (const outroDir of ['.claude', '.agents']) {
        const marcadorOutro = skillAgentMarker(path.join(rootDir, outroDir, 'skills', 'onp-spec-driven'));
        if (marcadorOutro && marcadorOutro !== 'cursor') {
          console.log(
            `⚠ this project also has the skill for agent "${marcadorOutro}" in ${outroDir}/skills/onp-spec-driven — Cursor reads that directory too and may load the wrong skill.\n` +
              `  If this project is for Cursor, remove the other one: rm -rf ${outroDir}/skills/onp-spec-driven`
          );
        }
      }
    }
  }

  console.log('\nnext step: onp-spec new <feature-name>');
  return 0;
}

function copyDirIfExists(src, dest) {
  if (!existsSync(src)) return;
  cpSync(src, dest, { recursive: true });
}

function cmdNew(rootDir, name, flags) {
  if (!name) {
    console.error('usage: onp-spec new <feature-name> (kebab-case, e.g.: entrega-dever-casa)');
    return 2;
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    console.error(`invalid name: "${name}" — use kebab-case (lowercase letters, numbers and hyphen)`);
    return 2;
  }
  const dir = path.join(rootDir, '.spec', 'features', name);
  if (existsSync(path.join(dir, 'spec.md'))) {
    console.error(`feature "${name}" already exists in .spec/features/${name}/`);
    return 2;
  }
  mkdirSync(dir, { recursive: true });

  // unique IDs in the project: continue the numbering from the highest existing ID
  const config = loadConfig(rootDir);
  const project = loadProject(config);
  let maxUs = 0;
  let maxAc = 0;
  for (const feature of project.features) {
    if (!feature.spec) continue;
    for (const s of feature.spec.stories) {
      maxUs = Math.max(maxUs, parseInt(s.id.slice(3), 10));
      for (const ac of s.acs) maxAc = Math.max(maxAc, parseInt(ac.id.slice(3), 10));
    }
  }
  const pad = (n) => String(n).padStart(3, '0');
  const titulo = name
    .split('-')
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

  let spec = template('spec.md');
  spec = fill(spec, { TITULO: titulo, FEATURE: name, TITULO_HISTORIA: '[story title]' });
  spec = spec.replace('US-001', `US-${pad(maxUs + 1)}`).replace('AC-001', `AC-${pad(maxAc + 1)}`);
  writeFileSync(path.join(dir, 'spec.md'), spec);

  let tasks = template('tasks.md');
  tasks = fill(tasks, { TITULO: titulo, FEATURE: name });
  tasks = tasks
    .replace('US-001, AC-001', `US-${pad(maxUs + 1)}, AC-${pad(maxAc + 1)}`);
  writeFileSync(path.join(dir, 'tasks.md'), tasks);

  console.log(`✔ .spec/features/${name}/spec.md`);
  console.log(`✔ .spec/features/${name}/tasks.md`);
  console.log(`\nnext steps:`);
  console.log(`  1. write the user stories and acceptance criteria (Given/When/Then)`);
  console.log(`     and FILL IN the Assumptions and Open Questions sections`);
  console.log(`  2. onp-spec scaffold ${name}   # each criterion becomes an executable test`);
  console.log(`  3. onp-spec audit              # see what's missing`);
  console.log(`  4. onp-spec plano ${name}      # with the tasks written: parallel execution plan`);
  return 0;
}

// Detects which agent the plan artifacts should target: an explicit flag wins;
// otherwise the `agent:` marker of the embedded skill itself is the source of
// truth (Codex and Antigravity share .agents/, so the path alone doesn't
// suffice); otherwise the engine's path; otherwise whatever is installed in
// the project; default: claude.
function detectarAgente(rootDir, flag) {
  if (flag !== undefined && flag !== true) {
    if (!AGENTES.includes(flag)) return { erro: `unknown --agents: "${flag}" (use: ${AGENTES.join(', ')})` };
    return { agent: flag };
  }
  // embedded engine: this file lives at <skill>/scripts/lib/src
  const marcadorProprio = skillAgentMarker(path.join(__dirname, '..', '..', '..'));
  if (AGENTES.includes(marcadorProprio)) return { agent: marcadorProprio };
  const segmentos = __dirname.split(path.sep);
  if (segmentos.includes('.codex')) return { agent: 'codex' };
  // only .cursor/skills counts: ~/.cursor/worktrees/<repo> is a plain checkout
  // of Cursor's parallel agents, not a skill installation
  const iCursor = segmentos.indexOf('.cursor');
  if (iCursor !== -1 && segmentos[iCursor + 1] === 'skills') return { agent: 'cursor' };
  const iOpencode = segmentos.indexOf('.opencode');
  if (iOpencode !== -1 && segmentos[iOpencode + 1] === 'skills') return { agent: 'opencode' };
  if (segmentos.includes('.agents')) return { agent: 'antigravity' };
  if (segmentos.includes('.claude')) return { agent: 'claude' };
  const temClaude = existsSync(path.join(rootDir, '.claude', 'skills', 'onp-spec-driven'));
  const marcadorProjeto = skillAgentMarker(path.join(rootDir, '.agents', 'skills', 'onp-spec-driven'));
  if (AGENTES.includes(marcadorProjeto) && !temClaude) return { agent: marcadorProjeto };
  const marcadorCursor = skillAgentMarker(path.join(rootDir, '.cursor', 'skills', 'onp-spec-driven'));
  if (AGENTES.includes(marcadorCursor) && !temClaude) return { agent: marcadorCursor };
  const marcadorOpencode = skillAgentMarker(path.join(rootDir, '.opencode', 'skills', 'onp-spec-driven'));
  if (AGENTES.includes(marcadorOpencode) && !temClaude) return { agent: marcadorOpencode };
  const temAg = existsSync(path.join(rootDir, '.agents', 'skills', 'onp-spec-driven'));
  if (temAg && !temClaude) return { agent: 'antigravity' };
  return { agent: 'claude' };
}

function gerarArtefatosPlano(project, featureName, agent, { sequencial = false, paralelizar, modelo, esforco } = {}) {
  const plan = montarPlano(project, featureName, {
    agent,
    sequencial,
    paralelizar,
    modelo,
    esforco,
    enginePath: process.argv[1],
  });
  if (plan.erro) return plan;
  const dir = path.join(project.config.rootDir, plan.baseDir);
  writeFileSync(path.join(dir, 'plano-execucao.md'), renderPlanoMd(plan));
  const planoJson = renderPlanoJson(plan);
  writeFileSync(path.join(dir, 'plano.json'), planoJson);
  const gerados = [`${plan.baseDir}/plano-execucao.md`, `${plan.baseDir}/plano.json`];
  if (usaExecutorSh(plan.agent)) {
    const sh = path.join(dir, 'executar-tarefas.sh');
    writeFileSync(sh, renderPlanoSh(plan));
    chmodSync(sh, 0o755);
    writeFileSync(path.join(dir, 'plano-execucao.html'), renderPlanoHtml(plan));
    gerados.push(`${plan.baseDir}/executar-tarefas.sh`, `${plan.baseDir}/plano-execucao.html`);
  }
  // records the execution in the GLOBAL ledger: this is how `onp-spec resumo`
  // sees this project alongside the others, even before any execution starts
  registrarEvento({
    tipo: 'plano',
    runId: plan.runId,
    projeto: plan.repoName,
    projetoDir: project.config.rootDir,
    feature: plan.feature,
    agent: plan.agent,
    plano: JSON.parse(planoJson),
  });
  podarLedger();
  plan.gerados = gerados;
  return plan;
}

// `onp-spec evento` — used by executar-tarefas.sh to feed the global ledger.
// Internal: it doesn't appear in the main help.
function cmdEvento(flags) {
  if (!flags.run || !flags.tipo) {
    console.error('internal usage: onp-spec evento --run <runId> --tipo <plano|start|faixa|tarefa|gate|end> [...]');
    return 2;
  }
  const num = (v) => (v === undefined || v === true ? undefined : parseInt(v, 10));
  registrarEvento({
    runId: flags.run,
    tipo: flags.tipo,
    faixa: typeof flags.faixa === 'string' ? flags.faixa : undefined,
    tarefa: typeof flags.tarefa === 'string' ? flags.tarefa : undefined,
    estado: typeof flags.estado === 'string' ? flags.estado : undefined,
    etapa: typeof flags.etapa === 'string' ? flags.etapa : undefined,
    stream: typeof flags.stream === 'string' ? flags.stream : undefined,
    escopo: typeof flags.escopo === 'string' ? flags.escopo : undefined,
    exit: num(flags.exit),
    tentativa: num(flags.tentativa),
  });
  return 0;
}

// `onp-spec stream-resumo <runId> <chave>` — one readable line in the terminal
// from the NDJSON stream (the full stream stays in the ledger for diagnosis)
function cmdStreamResumo(positional) {
  const [runId, chave] = positional;
  if (!runId || !chave) {
    console.error('internal usage: onp-spec stream-resumo <runId> <chave>');
    return 2;
  }
  const { itens, resumo, existe } = lerStream(runId, chave);
  if (!existe) {
    console.log(`  (no stream recorded for ${chave})`);
    return 0;
  }
  const ferramentas = itens.filter((i) => i.tipo === 'ferramenta');
  const contagem = {};
  for (const f of ferramentas) contagem[f.nome] = (contagem[f.nome] || 0) + 1;
  const usadas = Object.entries(contagem)
    .map(([n, c]) => (c > 1 ? `${n}×${c}` : n))
    .join(', ');
  const partes = [];
  if (resumo) {
    partes.push(resumo.status);
    if (resumo.turnos != null) partes.push(`${resumo.turnos} turn(s)`);
    if (resumo.duracaoMs != null) partes.push(`${(resumo.duracaoMs / 1000).toFixed(1)}s`);
    if (resumo.custoUsd != null) partes.push(`US$ ${resumo.custoUsd.toFixed(4)}`);
  }
  console.log(`  ↳ ${chave}: ${partes.join(' · ') || 'in progress'}${usadas ? ` · tools: ${usadas}` : ''}`);
  return 0;
}

function cmdPlano(project, positional, flags) {
  const featureName = positional[0];
  if (!featureName) {
    console.error('usage: onp-spec plano <feature> [--agents claude|antigravity|codex|cursor|opencode] [--paralelizar T-xxx,T-yyy] [--sequencial]');
    return 2;
  }
  const det = detectarAgente(project.config.rootDir, flags.agents);
  if (det.erro) {
    console.error(det.erro);
    return 2;
  }
  if (flags.sequencial && flags.paralelizar) {
    console.error('error: use --paralelizar OR --sequencial — combining both makes no sense');
    return 2;
  }
  if (det.agent === 'cursor' && typeof flags.esforco === 'string') {
    console.log(
      '⚠ the Cursor CLI has no effort flag — the value is recorded in the plan, but the level goes into the model slug (e.g.: gpt-5.6-terra-high)'
    );
  }
  if (flags.modelo === true) {
    console.error('error: --modelo needs a value (e.g.: --modelo gpt-5.6-luna)');
    return 2;
  }
  if (flags.esforco === true) {
    console.error('error: --esforco needs a value (low|medium|high|xhigh|max)');
    return 2;
  }
  const paralelizar =
    flags.paralelizar === undefined
      ? undefined
      : flags.paralelizar === true
        ? []
        : String(flags.paralelizar)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
  const plan = gerarArtefatosPlano(project, featureName, det.agent, {
    sequencial: Boolean(flags.sequencial),
    paralelizar,
    modelo: typeof flags.modelo === 'string' ? flags.modelo : undefined,
    esforco: typeof flags.esforco === 'string' ? flags.esforco : undefined,
  });
  if (plan.erro) {
    console.error(`error: ${plan.erro}`);
    return 2;
  }

  const paralelas = plan.faixas.reduce((n, fx) => n + fx.tasks.length, 0);
  if (plan.modo === 'sequencial') {
    console.log(
      `✔ execution plan (${det.agent}, SEQUENTIAL — user's choice): ` +
        `${plan.sequenciais.length} task(s), one after another, on the main tree`
    );
  } else {
    console.log(
      `✔ execution plan (${det.agent}): ${paralelas + plan.sequenciais.length} task(s) — ` +
        `${paralelas} CAN RUN IN PARALLEL across ${plan.faixas.length} lane(s) · ${plan.sequenciais.length} sequential · ${plan.ondas.length} wave(s)`
    );
    if (plan.paralelizar) {
      console.log(`  (user selection: ${plan.paralelizar.join(', ')} in parallel; the rest run one after another at the end)`);
    } else {
      console.log(
        '  (want to choose? regenerate with: onp-spec plano ' +
          featureName +
          ' --paralelizar T-xxx,T-yyy — or --sequencial to run one after another)'
      );
    }
  }
  console.log('\nwhere everything is:');
  console.log(`  · plan (read first): ${plan.gerados[0]}`);
  if (usaExecutorSh(plan.agent)) {
    console.log(`  · headless executor:  ${plan.baseDir}/executar-tarefas.sh`);
    console.log(`  · visual (read-only): ${plan.baseDir}/plano-execucao.html`);
  }
  for (const a of plan.avisos) console.log(`  ⚠ ${a}`);
  // cost belongs to the user: on codex and cursor, the agent presents the model
  // (and effort, when the CLI accepts it) per task and CONFIRMS before running
  // (a cheap license burns tokens fast)
  if (det.agent === 'codex') {
    console.log('\nmodels and efforts for this plan — CONFIRM with the user before executing (the tokens are theirs):');
    const todas = [...plan.faixas.flatMap((fx) => fx.tasks), ...plan.sequenciais];
    for (const t of todas) console.log(`  · ${t.id} — ${t.model} · effort ${t.esforcoCli}`);
    console.log(
      `  want to spend less? everything: onp-spec plano ${featureName} --modelo gpt-5.6-luna --esforco low` +
        `\n  per task: onp-spec tarefa ${featureName} T-xxx --modelo <m> --esforco <level> (and regenerate the plan)`
    );
  }
  if (det.agent === 'cursor') {
    console.log('\nmodels for this plan — CONFIRM with the user before executing (the tokens are theirs):');
    const todas = [...plan.faixas.flatMap((fx) => fx.tasks), ...plan.sequenciais];
    for (const t of todas) console.log(`  · ${t.id} — ${t.model}`);
    console.log(
      '  (effort in Cursor is embedded in the model slug, e.g.: gpt-5.6-terra-high — there is no flag)' +
        `\n  want to spend less? everything: onp-spec plano ${featureName} --modelo composer (usage included in Cursor's paid plans)` +
        `\n  per task: onp-spec tarefa ${featureName} T-xxx --modelo <m> (and regenerate the plan)`
    );
  }
  if (det.agent === 'opencode') {
    console.log('\nmodels and efforts for this plan — CONFIRM with the user before executing (the tokens are theirs):');
    const todas = [...plan.faixas.flatMap((fx) => fx.tasks), ...plan.sequenciais];
    for (const t of todas) console.log(`  · ${t.id} — ${t.model} · effort ${t.esforcoCli}`);
    console.log(
      `  want to spend less? everything: onp-spec plano ${featureName} --modelo openai/gpt-5.6-luna --esforco low` +
        `\n  per task: onp-spec tarefa ${featureName} T-xxx --modelo <provider/model> --esforco <level> (and regenerate the plan)`
    );
  }
  console.log('\nnext step:');
  if (usaExecutorSh(plan.agent)) {
    console.log(`  · run: bash ${plan.baseDir}/executar-tarefas.sh`);
    console.log('    (while it runs, the general progress summary is printed every 1 min — relay it to the user)');
  } else {
    console.log(`  · open a new agent (clean window) per lane and paste the matching prompt`);
    console.log(`    from plano-execucao.md — then merge + verify + audit, as described there`);
  }
  return 0;
}

// `onp-spec resumo` — the GENERAL PROGRESS SUMMARY. It's the text the agent
// posts to the chat about every ~1 minute while an execution is running.
// Without flags, prints it (fresh AI from the ledger > deterministic engine);
// with --gravar, records it in the ledger (--texto = written by the AI/agent
// of the executor).
function cmdResumo(config, positional, flags) {
  const feature = positional[0] || null;
  const filtro = flags.global ? {} : { projetoDir: config.rootDir, feature };
  const projetos = montarArvore(lerEventos(), filtro);

  if (flags.contexto) {
    console.log(contextoParaIa(projetos));
    return 0;
  }

  // the progress TABLE (markdown) — the agent pastes it in the chat about every ~1 min
  if (flags.tabela) {
    console.log(tabelaAndamento(projetos));
    return 0;
  }

  if (flags.gravar) {
    const alvo = execucaoAlvo(projetos, { runId: typeof flags.run === 'string' ? flags.run : null });
    if (!alvo) {
      console.error('no execution in the ledger to record the summary — generate a plan first (onp-spec plano <feature>)');
      return 2;
    }
    const temTexto = typeof flags.texto === 'string' && flags.texto.trim();
    const texto = temTexto ? flags.texto : resumoDeterministico(projetos);
    const origem = temTexto ? (flags.origem === 'engine' ? 'engine' : 'ai') : 'engine';
    const r = registrarResumo({ runId: alvo.runId, texto, origem });
    if (r.erro) {
      console.error(`error: ${r.erro}`);
      return 2;
    }
    console.log(`✔ summary recorded (origin: ${r.origem}) for "${alvo.feature}"`);
    console.log(r.texto);
    return 0;
  }

  console.log(montarResumoAtual(projetos).texto);
  return 0;
}

// inserts or replaces a list field (- Model:/- Effort:) inside the task's
// section in tasks.md — in the SAME format the parser reads; this is how the
// user adjusts the per-task cost without editing the file by hand
function definirCampoTarefa(linhas, taskId, matcher, rotulo, valor) {
  const reTitulo = new RegExp(`^##\\s+${taskId}\\s*${DASH}\\s*`);
  const inicio = linhas.findIndex((l) => reTitulo.test(l));
  if (inicio === -1) return false;
  let fim = linhas.length;
  for (let i = inicio + 1; i < linhas.length; i++) {
    if (/^##\s+/.test(linhas[i])) {
      fim = i;
      break;
    }
  }
  const reCampo = new RegExp(`^\\s*[-*]\\s*${matcher}\\s*:`, 'i');
  for (let i = inicio + 1; i < fim; i++) {
    if (reCampo.test(linhas[i])) {
      linhas[i] = `- ${rotulo}: ${valor}`;
      return true;
    }
  }
  // field doesn't exist yet: insert it after the section's last list line
  let pos = inicio;
  for (let i = inicio + 1; i < fim; i++) {
    if (/^\s*[-*]\s/.test(linhas[i])) pos = i;
  }
  if (pos === inicio) linhas.splice(inicio + 1, 0, '', `- ${rotulo}: ${valor}`);
  else linhas.splice(pos + 1, 0, `- ${rotulo}: ${valor}`);
  return true;
}

const FEATURE_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

// 🔒 SECURITY: every CLI value that becomes a filesystem path must be
// validated before joining. Allows kebab-case feature names and strict
// T-xxx task ids (also renders the task regex a constant — no ReDoS / regex
// injection through `taskId`).
const FEATURE_NAME_HINT = 'kebab-case (lowercase letters, numbers and hyphen)';
const TASK_ID_RE = /^T-\d{3,}$/;

function validFeatureName(name) {
  return typeof name === 'string' && FEATURE_NAME_RE.test(name);
}

function validTaskId(id) {
  return typeof id === 'string' && TASK_ID_RE.test(id);
}

// 🔒 SECURITY: joins a user value into a path and verifies the result stays
// inside `rootDir`. Throws on escape (absolute input, `..`, symlink-free
// containment check on the resolved path).
export function containedPath(rootDir, name, kind, segments) {
  const base = path.resolve(rootDir);
  const joined = path.resolve(base, ...segments);
  if (joined !== base && !joined.startsWith(`${base}${path.sep}`)) {
    throw new Error(`${kind} "${name}" escapes the project root`);
  }
  return joined;
}

function cmdTarefa(config, positional, flags = {}) {
  const [featureName, taskId, statusRaw] = positional;
  const modelo = typeof flags.modelo === 'string' ? flags.modelo : null;
  const esforcoRaw = typeof flags.esforco === 'string' ? flags.esforco : null;
  const USO =
    'usage: onp-spec tarefa <feature> <T-xxx> [pending|in-progress|done] [--modelo <model>] [--esforco low|medium|high|xhigh|max]';
  if (!featureName || !taskId || (!statusRaw && !modelo && !esforcoRaw) || flags.modelo === true || flags.esforco === true) {
    console.error(USO);
    return 2;
  }
  if (!validFeatureName(featureName)) {
    console.error(`invalid feature name: "${featureName}" — use ${FEATURE_NAME_HINT}`);
    return 2;
  }
  if (!validTaskId(taskId)) {
    console.error(`invalid task id: "${taskId}" — use T-xxx (e.g. T-004)`);
    return 2;
  }
  let status = null;
  if (statusRaw) {
    status = foldStatus(statusRaw);
    if (!TASK_STATUSES.includes(status)) {
      console.error(`invalid status: "${statusRaw}" (use: ${TASK_STATUSES.join(', ')})`);
      return 2;
    }
  }
  if (esforcoRaw && !normalizarEsforco(esforcoRaw)) {
    console.error(`invalid effort: "${esforcoRaw}" (use: low|medium|high|xhigh|max)`);
    return 2;
  }
  const tasksPath = containedPath(config.rootDir, featureName, 'feature', [config.specDir, 'features', featureName, 'tasks.md']);
  if (!existsSync(tasksPath)) {
    console.error(`did not find ${config.specDir}/features/${featureName}/tasks.md`);
    return 2;
  }
  let conteudo = readFileSync(tasksPath, 'utf-8');
  const re = new RegExp(`^(##\\s+${taskId}\\s*${DASH}\\s*.*?)(\\s*\\[[^\\]]+\\])?\\s*$`, 'm');
  if (!re.test(conteudo)) {
    console.error(`task ${taskId} not found in ${config.specDir}/features/${featureName}/tasks.md`);
    return 2;
  }
  const mudancas = [];
  if (status) {
    conteudo = conteudo.replace(re, `$1 [${status}]`);
    mudancas.push(`→ [${status}]`);
  }
  if (modelo || esforcoRaw) {
    const linhas = conteudo.split('\n');
    if (modelo) {
      definirCampoTarefa(linhas, taskId, 'Model', 'Model', modelo);
      mudancas.push(`Model: ${modelo}`);
    }
    if (esforcoRaw) {
      definirCampoTarefa(linhas, taskId, 'Effort', 'Effort', esforcoRaw);
      mudancas.push(`Effort: ${esforcoRaw}`);
    }
    conteudo = linhas.join('\n');
  }
  writeFileSync(tasksPath, conteudo);
  console.log(`✔ ${taskId} ${mudancas.join(' · ')} in ${config.specDir}/features/${featureName}/tasks.md`);
  if (modelo || esforcoRaw) {
    console.log(`· model/effort changed — regenerate the plan: onp-spec plano ${featureName}`);
  }
  return 0;
}

function cmdStatus(project) {
  if (project.errors.length) {
    for (const e of project.errors) console.error(`error: ${e}`);
    return 2;
  }
  const testFileSet = new Set(project.testFiles);
  const provenTags = project.annotations.specTags.filter((t) => testFileSet.has(t.file));

  const cols = ['criteria', 'with-test', 'proven', 'assumptions?', 'questions?'];
  const header =
    'feature'.padEnd(30) + ' ' + 'status'.padEnd(18) + cols.map((c) => ` ${c}`).join('');
  console.log(header);
  console.log('─'.repeat(header.length));
  for (const feature of project.features) {
    const spec = feature.spec;
    if (!spec) {
      console.log(`${feature.name.padEnd(30)} NO SPEC`);
      continue;
    }
    const acs = allAcs(spec);
    const withTest = acs.filter((ac) => provenTags.some((t) => t.acId === ac.id)).length;
    const v = project.verifications[feature.name];
    const proven = acs.filter((ac) => v?.results?.[ac.id]?.status === 'pass').length;
    const asmOpen = spec.assumptions.filter((a) => a.status === 'open').length;
    const qOpen = spec.questions.filter((q) => q.status === 'open').length;
    const vals = [acs.length, withTest, proven, asmOpen, qOpen];
    console.log(
      `${feature.name.padEnd(30)} ${(spec.status || '—').padEnd(18)}` +
        vals.map((v, i) => ` ${String(v).padStart(cols[i].length)}`).join('')
    );
  }
  console.log(
    '\nlegend: criteria = acceptance criteria · with-test = have an annotated test (@spec:) ·' +
      '\n         proven = PASS on the last verify · assumptions?/questions? = still open'
  );
  return 0;
}

function cmdAssumptions(project) {
  let any = false;
  for (const feature of project.features) {
    if (!feature.spec) continue;
    const { assumptions, questions } = feature.spec;
    if (!assumptions.length && !questions.length) continue;
    any = true;
    console.log(`\n${feature.name}:`);
    for (const a of assumptions) {
      const mark = a.status === 'open' ? '⚠' : a.status === 'invalidated' ? '✘' : '✔';
      console.log(`  ${mark} ${a.id} [${a.status}] ${a.text}${a.resolution && a.resolution !== '—' ? ` → ${a.resolution}` : ''}`);
    }
    for (const q of questions) {
      const mark = q.status === 'open' ? '?' : '✔';
      console.log(`  ${mark} ${q.id} [${q.status}] ${q.text}${q.answer && q.answer !== '—' ? ` → ${q.answer}` : ''}`);
    }
  }
  if (!any) console.log('no assumptions or questions recorded — that is suspicious: almost every feature hides one.');
  return 0;
}

const HELP_LICOES = `onp-spec licoes — lessons learned with mechanical backing

The agent brings the judgment (phrasing the general rule); the engine validates
the backing: a lesson only gets in if it cites a REAL signal recorded by
audit/verify in .spec/verification/sinais.json. Without a signal, it's opinion —
rejected.

subcommands:
  add --sinal <CODE> --feature <feature> --fonte <AC-xxx|file>
      --texto "general rule in one sentence" [--escopo <domain>]
                     records a lesson (candidate); when it recurs in another
                     feature, the engine promotes it to confirmed
  list [--status confirmada|candidata|quarentena|todas] [--escopo <domain>]
       [--query <term>] [--limite N]
                     lessons to load into Specifying/Designing
                     (default: only confirmed, at most ${LICOES_DEFAULTS.limiteListagem})
  sugerir [--limite N]
                     mechanical mining: recurring signals across distinct
                     features that still have no lesson
  penalizar --id L-xxx
                     the lesson was applied and the failure recurred; 2 penalties
                     move it to quarantine
  status             counts per status + file paths`;

function linhaLicao(l) {
  const escopo = l.escopo ? ` · scope ${l.escopo}` : '';
  return `${l.id} [${l.status}] (${l.recorrencia} feature(s) · ${l.sinal}${escopo}) ${l.texto}`;
}

function cmdLicoes(config, positional, flags) {
  const specRoot = path.join(config.rootDir, config.specDir);
  if (!existsSync(specRoot)) {
    console.error(`directory ${config.specDir}/ not found — run \`onp-spec init\` first`);
    return 2;
  }
  const sub = positional[0];
  const cfg = config.licoes;
  const data = carregarLicoes(specRoot);

  if (!sub || sub === 'help') {
    console.log(HELP_LICOES);
    return 0;
  }

  if (sub === 'add') {
    const sinais = carregarSinais(specRoot);
    const resultado = adicionarLicao(
      data,
      sinais,
      {
        texto: flags.texto,
        sinal: flags.sinal,
        feature: flags.feature,
        fonte: flags.fonte,
        escopo: flags.escopo,
      },
      cfg
    );
    if (resultado.erro) {
      console.error(`error: ${resultado.erro}`);
      return 2;
    }
    const podadas = podarLicoes(data, cfg);
    salvarLicoes(specRoot, data);
    const { licao, evento } = resultado;
    const rotulo = {
      criada: `✔ ${licao.id} recorded as candidate (1 feature) — becomes confirmed after recurring in ${cfg.limiarPromocao - 1} other(s)`,
      reforcada: `✔ ${licao.id} reinforced (${licao.recorrencia} feature(s): ${licao.features.join(', ')})`,
      promovida: `★ ${licao.id} PROMOTED to confirmed (${licao.features.join(', ')}) — enters the Specifying/Designing guide`,
    }[evento];
    console.log(rotulo);
    if (podadas.length) console.log(`· pruned for stagnation: ${podadas.join(', ')}`);
    return 0;
  }

  if (sub === 'list') {
    const licoes = listarLicoes(data, {
      status: flags.status || 'confirmada',
      escopo: typeof flags.escopo === 'string' ? flags.escopo : null,
      query: typeof flags.query === 'string' ? flags.query : null,
      limite: parseInt(flags.limite, 10) || cfg.limiteListagem,
    });
    if (!licoes.length) {
      console.log(
        flags.status && flags.status !== 'confirmada'
          ? 'no lesson matches that filter'
          : 'no confirmed lessons yet — candidates become confirmed after recurring in distinct features (onp-spec licoes list --status todas)'
      );
      return 0;
    }
    for (const l of licoes) console.log(linhaLicao(l));
    return 0;
  }

  if (sub === 'sugerir') {
    const sinais = carregarSinais(specRoot);
    const sugestoes = sugerirLicoes(data, sinais, cfg, {
      limite: parseInt(flags.limite, 10) || 5,
    });
    if (!sugestoes.length) {
      console.log(
        `no recurrent signal across ${cfg.limiarPromocao}+ distinct features — nothing worth a lesson for now (a clean path doesn't generate lessons; that's correct)`
      );
      return 0;
    }
    console.log('recurrent signals — the engine points WHERE a lesson is worth it; the phrasing is yours:');
    for (const s of sugestoes) {
      console.log(
        `  ${s.sinal} — ${s.features.length} distinct feature(s) · ${s.ocorrencias} occurrence(s) · existing lessons: ${s.licoesExistentes}`
      );
      console.log(`    features: ${s.features.slice(0, 6).join(', ')}${s.features.length > 6 ? ` (+${s.features.length - 6})` : ''}`);
      console.log(`    refs: ${s.refs.join(', ')}`);
    }
    console.log('\nrecord with: onp-spec licoes add --sinal <CODE> --feature <f> --fonte <ref> --texto "..."');
    return 0;
  }

  if (sub === 'penalizar') {
    if (typeof flags.id !== 'string') {
      console.error('usage: onp-spec licoes penalizar --id L-xxx');
      return 2;
    }
    const resultado = penalizarLicao(data, flags.id, cfg);
    if (resultado.erro) {
      console.error(`error: ${resultado.erro}`);
      return 2;
    }
    salvarLicoes(specRoot, data);
    const { licao, evento } = resultado;
    console.log(
      evento === 'quarentenada'
        ? `✘ ${licao.id} moved to QUARANTINE (${licao.penalidades} penalties) — leaves the guide; review is up to the user`
        : `⚠ ${licao.id} penalized (${licao.penalidades}/${cfg.limiarQuarentena}) — ${cfg.limiarQuarentena - licao.penalidades} more moves it to quarantine`
    );
    return 0;
  }

  if (sub === 'status') {
    const contagem = { confirmada: 0, candidata: 0, quarentena: 0 };
    for (const l of data.licoes) contagem[l.status] = (contagem[l.status] || 0) + 1;
    const sinais = carregarSinais(specRoot);
    console.log(
      `lessons: ${contagem.confirmada} confirmed · ${contagem.candidata} candidate(s) · ${contagem.quarentena} in quarantine`
    );
    console.log(`signals in history: ${Object.keys(sinais.sinais).length} distinct failure point(s)`);
    console.log(`files: ${config.specDir}/licoes.json (canonical) · ${config.specDir}/LICOES.md (readable)`);
    return 0;
  }

  console.error(`unknown subcommand: licoes ${sub}\n`);
  console.log(HELP_LICOES);
  return 2;
}

export async function run(argv) {
  const [command, ...rest] = argv;
  const { flags, positional } = parseFlags(rest);
  const rootDir = process.cwd();

  if (!command || command === 'help' || flags.help) {
    console.log(HELP);
    return 0;
  }

  if (command === 'version' || flags.version) {
    try {
      const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
      console.log(pkg.version);
    } catch {
      // engine embedded in the skill doesn't load package.json
      console.log('embedded (skill onp-spec-driven)');
    }
    return 0;
  }

  if (command === 'init') return cmdInit(rootDir, flags);
  if (command === 'new') return cmdNew(rootDir, positional[0], flags);

  const config = loadConfig(rootDir);

  // lessons don't need the project loaded — on big repos, listing the guide at
  // the start of Specifying has to be cheap
  if (command === 'licoes') return cmdLicoes(config, positional, flags);
  // tarefa likewise: a point edit of status/model/effort in tasks.md
  if (command === 'tarefa') return cmdTarefa(config, positional, flags);
  // internal commands of executar-tarefas.sh (feed/read the global ledger)
  if (command === 'evento') return cmdEvento(flags);
  if (command === 'stream-resumo') return cmdStreamResumo(positional);
  // general progress summary: only needs the ledger, not the loaded project
  if (command === 'resumo') return cmdResumo(config, positional, flags);

  const project = loadProject(config);

  if (command === 'plano') return cmdPlano(project, positional, flags);

  if (command === 'audit') {
    const audit = auditProject(project, { ci: Boolean(flags.ci) });
    if (flags.json) {
      console.log(renderJson(audit));
    } else {
      console.log(renderTerminal(audit));
    }
    if (flags.md) {
      const outPath = typeof flags.md === 'string' ? flags.md : '.spec/AUDITORIA.md';
      // 🔒 SECURITY: constrain the report path inside rootDir — a `--md`
      // with `../` / absolute would let the CLI write arbitrary files.
      const reportPath = containedPath(project.config.rootDir, outPath, 'report', [outPath]);
      writeFileSync(reportPath, renderMarkdown(audit));
      console.log(`report saved to ${outPath}`);
    }
    const registrados = registrarAchados(project.specRoot, audit.findings, {
      gitRev: gitRev(rootDir),
      ...config.licoes,
    });
    if (registrados) {
      console.log(
        `${registrados} signal(s) recorded in the history — after fixing: onp-spec licoes sugerir`
      );
    }
    return audit.exitCode;
  }

  if (command === 'verify') {
    const featureName = positional[0];
    if (!featureName) {
      console.error('usage: onp-spec verify <feature>');
      return 2;
    }
    const { record, hint } = runVerify(project, featureName);
    const sinaisFalha = registrarVerify(project.specRoot, record, config.licoes);
    const total = Object.keys(record.results).length;
    const passed = Object.values(record.results).filter((r) => r.status === 'pass').length;
    console.log(
      `verify ${featureName}: ${passed}/${total} acceptance criteria with PASS proof · ${record.testsParsed} test(s) read · exit ${record.exitCode}`
    );
    for (const [acId, r] of Object.entries(record.results)) {
      const mark = r.status === 'pass' ? '✔' : r.status === 'skip' ? '○ SKIP (not proof)' : '✘';
      console.log(`  ${mark} ${acId} ${r.testName ? `— ${r.testName}` : ''}`);
    }
    if (hint) console.log(`  hint: ${hint}`);
    const principles = Object.entries(record.principles || {});
    if (principles.length) {
      console.log('  principles:');
      for (const [pId, r] of principles) {
        console.log(`  ${r.status === 'pass' ? '✔' : '✘'} ${pId} — ${r.testName}`);
      }
    }
    if (sinaisFalha) {
      console.log(`  ${sinaisFalha} failure/skip signal(s) recorded in the history`);
    }
    console.log(`proof saved to .spec/verification/${featureName}.json — run \`onp-spec audit\``);
    return passed === total && total > 0 ? 0 : 1;
  }

  if (command === 'scaffold') {
    const featureName = positional[0];
    if (!featureName) {
      console.error('usage: onp-spec scaffold <feature> [--force]');
      return 2;
    }
    const result = scaffoldTests(project, featureName, { force: Boolean(flags.force) });
    if (result.created) {
      console.log(`✔ ${result.created} created with ${result.pending} skeleton test(s) (they all FAIL until you implement)`);
      console.log(`  covered criteria: ${result.acIds.join(', ')}`);
    } else {
      console.log(result.message);
    }
    return 0;
  }

  if (command === 'status') return cmdStatus(project);
  if (command === 'assumptions') return cmdAssumptions(project);

  console.error(`unknown command: ${command}\n`);
  console.log(HELP);
  return 2;
}
