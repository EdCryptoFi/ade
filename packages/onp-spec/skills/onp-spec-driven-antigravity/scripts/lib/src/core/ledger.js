// Global ledger — ONE file for every execution, across all projects.
//
//   ~/.onp-spec/painel/ledger.jsonl        (override: ONP_SPEC_HOME)
//   ~/.onp-spec/painel/streams/<runId>/<chave>.jsonl
//
// Each ledger line is a JSON event. It is the shared source of truth of what
// is running: `onp-spec resumo` reads this single file and assembles the
// project → execution → lane → task tree, so it works even with different
// projects running at the same time (the user's repo keeps no execution
// state).
//
// Event types:
//   plano  {runId, projeto, projetoDir, feature, agent, plano}
//   faixa  {runId, faixa, estado: running|merging|merged|conflict|failed, tentativa}
//   tarefa {runId, tarefa, faixa, estado: running|done|failed, stream}
//   gate   {runId, etapa: start|verify|audit, exit}
//   end    {runId, exit, escopo}
//   resumo {runId, texto, origem: ai|engine} — the "general progress summary"
//          the executor records about every ~1 min and the agent relays in chat
//
// Each task's stream is the raw JSONL of the agent's headless CLI —
// `claude -p --output-format stream-json` (system/assistant/user/result
// events), `codex exec --json` (thread.*/turn.*/item.* events) or the Cursor
// CLI `agent -p --output-format stream-json` (system/assistant/tool_call/
// result events; init, assistant and result have the SAME shape as claude —
// only the tools arrive as tool_call) — and the parser below turns any of
// the three into a readable timeline.

import os from 'os';
import path from 'path';
import {
  appendFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readdirSync,
  statSync,
} from 'fs';

export const ESTADOS_FAIXA = ['waiting', 'running', 'merging', 'merged', 'conflict', 'failed'];
export const MAX_EXECUCOES = 30; // pruning: the oldest executions disappear (with their streams)

export function homeOnp() {
  return process.env.ONP_SPEC_HOME || path.join(os.homedir(), '.onp-spec');
}

export function caminhos() {
  const dir = path.join(homeOnp(), 'painel');
  return { dir, ledger: path.join(dir, 'ledger.jsonl'), streams: path.join(dir, 'streams') };
}

export function registrarEvento(evento) {
  const { dir, ledger } = caminhos();
  mkdirSync(dir, { recursive: true });
  const linha = JSON.stringify({ ts: new Date().toISOString(), ...evento });
  appendFileSync(ledger, `${linha}\n`);
  return linha;
}

export function lerEventos() {
  const { ledger } = caminhos();
  if (!existsSync(ledger)) return [];
  const out = [];
  for (const linha of readFileSync(ledger, 'utf-8').split('\n')) {
    if (!linha.trim()) continue;
    try {
      out.push(JSON.parse(linha));
    } catch {
      // corrupted line (disk full, truncated concurrent write) — ignore it
    }
  }
  return out;
}

export function caminhoStream(runId, chave) {
  return path.join(caminhos().streams, runId, `${chave}.jsonl`);
}

export function chaveStream(faixaOuSeq, tarefa) {
  return `${faixaOuSeq}--${tarefa}`;
}

// ── consolidated tree (what the summary narrates) ──────────────────────────

export function montarArvore(eventos, { projetoDir = null, feature = null } = {}) {
  const execucoes = new Map();

  for (const e of eventos) {
    if (e.tipo === 'plano') {
      const p = e.plano || {};
      execucoes.set(e.runId, {
        runId: e.runId,
        projeto: e.projeto,
        projetoDir: e.projetoDir,
        feature: e.feature,
        agent: e.agent,
        criadoEm: e.ts,
        atualizadoEm: e.ts,
        branchTrabalho: p.branchTrabalho,
        baseDir: p.baseDir,
        ondas: p.ondas || [],
        faixas: (p.faixas || []).map((fx) => ({
          id: fx.id,
          branch: fx.branch,
          worktree: fx.worktree,
          estado: 'waiting',
          tentativa: 0,
          tarefas: (fx.tarefas || []).map((t) => ({ ...t, estado: 'pending', stream: null })),
        })),
        sequenciais: (p.sequenciais || []).map((t) => ({ ...t, estado: 'pending', stream: null })),
        gate: { verify: null, audit: null },
        gateDesatualizado: false,
        fim: null,
        escopoUltimo: null,
        resumo: null,
      });
      continue;
    }
    const ex = execucoes.get(e.runId);
    if (!ex) continue; // execution event whose plan was pruned
    ex.atualizadoEm = e.ts;

    if (e.tipo === 'faixa') {
      const fx = ex.faixas.find((f) => f.id === e.faixa);
      if (fx) {
        fx.estado = e.estado;
        if (e.tentativa) fx.tentativa = e.tentativa;
        // a new attempt reopens the lane's tasks
        if (e.estado === 'running') {
          for (const t of fx.tarefas) if (t.estado !== 'done') t.estado = 'pending';
        }
      }
    } else if (e.tipo === 'tarefa') {
      const todas = [...ex.faixas.flatMap((f) => f.tarefas), ...ex.sequenciais];
      const t = todas.find((x) => x.id === e.tarefa);
      if (t) {
        t.estado = e.estado;
        if (e.stream) t.stream = e.stream;
      }
    } else if (e.tipo === 'gate') {
      if (e.etapa === 'start') ex.gate = { verify: null, audit: null };
      if (e.etapa === 'verify' || e.etapa === 'audit') ex.gate[e.etapa] = e.exit;
      // new audit = fresh verdict
      if (e.etapa === 'audit') ex.gateDesatualizado = false;
    } else if (e.tipo === 'end') {
      ex.fim = e.exit;
      ex.escopoUltimo = e.escopo || 'all';
    } else if (e.tipo === 'resumo') {
      // keep only the most recent: it's the text `onp-spec resumo` returns
      if (typeof e.texto === 'string' && e.texto.trim()) {
        ex.resumo = { texto: e.texto, origem: e.origem === 'ai' ? 'ai' : 'engine', ts: e.ts };
      }
    } else if (e.tipo === 'start') {
      ex.fim = null;
      ex.escopoUltimo = e.escopo || 'all';
      // any new work invalidates the previous verdict until the audit runs
      ex.gateDesatualizado = ex.gate.audit !== null;
      if (!e.escopo || e.escopo === 'all') {
        ex.gate = { verify: null, audit: null };
        ex.gateDesatualizado = false;
      }
    }
  }

  let lista = [...execucoes.values()];
  if (projetoDir) lista = lista.filter((ex) => path.resolve(ex.projetoDir || '') === path.resolve(projetoDir));
  if (feature) lista = lista.filter((ex) => ex.feature === feature);

  // an execution is "running" if some lane/task is in progress
  for (const ex of lista) {
    const emCurso =
      ex.faixas.some((f) => f.estado === 'running' || f.estado === 'merging') ||
      [...ex.faixas.flatMap((f) => f.tarefas), ...ex.sequenciais].some((t) => t.estado === 'running');
    ex.rodando = emCurso && ex.fim === null;
    const tarefas = [...ex.faixas.flatMap((f) => f.tarefas), ...ex.sequenciais];
    ex.total = tarefas.length;
    ex.concluidas = tarefas.filter((t) => t.estado === 'done').length;
    ex.falhas = ex.faixas.filter((f) => f.estado === 'failed' || f.estado === 'conflict').length;
  }

  // projects, most recent first
  const projetos = new Map();
  for (const ex of lista.sort((a, b) => (a.atualizadoEm < b.atualizadoEm ? 1 : -1))) {
    const chave = ex.projetoDir || ex.projeto;
    if (!projetos.has(chave)) {
      projetos.set(chave, { projeto: ex.projeto, projetoDir: ex.projetoDir, execucoes: [] });
    }
    projetos.get(chave).execucoes.push(ex);
  }
  return [...projetos.values()];
}

// ── pruning: the ledger is single and append-only; it cannot grow forever ──

export function podarLedger(maxExecucoes = MAX_EXECUCOES) {
  const { ledger, streams } = caminhos();
  if (!existsSync(ledger)) return { removidas: [] };
  const eventos = lerEventos();
  const ordem = [];
  for (const e of eventos) if (e.tipo === 'plano' && !ordem.includes(e.runId)) ordem.push(e.runId);
  if (ordem.length <= maxExecucoes) return { removidas: [] };

  const remover = new Set(ordem.slice(0, ordem.length - maxExecucoes));
  const mantidos = eventos.filter((e) => !remover.has(e.runId));
  writeFileSync(ledger, mantidos.map((e) => JSON.stringify(e)).join('\n') + (mantidos.length ? '\n' : ''));
  for (const runId of remover) rmSync(path.join(streams, runId), { recursive: true, force: true });
  return { removidas: [...remover] };
}

// ── model stream parser (claude -p NDJSON) ────────────────────────────────

const CORTE = 400;
const corta = (s, n = CORTE) => {
  const t = String(s == null ? '' : s);
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

// one-line summary per tool: what matters to watch live
export function resumoFerramenta(nome, input = {}) {
  const rel = (p) => String(p || '').split('/').slice(-3).join('/');
  switch (nome) {
    case 'Bash':
      return corta(input.command, 200);
    case 'Read':
      return rel(input.file_path);
    case 'Write':
      return `${rel(input.file_path)} (${String(input.content || '').split('\n').length} lines)`;
    case 'Edit':
      return `${rel(input.file_path)} — ${corta(String(input.old_string || '').split('\n')[0], 60)}`;
    case 'Glob':
    case 'Grep':
      return corta(input.pattern, 120);
    case 'TodoWrite':
      return `${(input.todos || []).length} item(s)`;
    case 'Task':
      return corta(input.description, 120);
    case 'WebFetch':
    case 'WebSearch':
      return corta(input.url || input.query, 120);
    default: {
      const chaves = Object.keys(input);
      if (!chaves.length) return '';
      return corta(`${chaves[0]}: ${JSON.stringify(input[chaves[0]])}`, 160);
    }
  }
}

// one-line summary per codex item (`codex exec --json`): returns
// {nome, resumo} for tool-like items, or null for those with their own
// handling (message, reasoning, end)
export function resumoItemCodex(item = {}) {
  switch (item.type) {
    case 'command_execution':
      return { nome: 'Bash', resumo: corta(item.command, 200) };
    case 'file_change': {
      const mudancas = (item.changes || []).map((c) => `${c.kind || '?'} ${String(c.path || '').split('/').slice(-3).join('/')}`);
      return { nome: 'Edit', resumo: corta(mudancas.join(', '), 200) };
    }
    case 'mcp_tool_call':
      return { nome: [item.server, item.tool].filter(Boolean).join('.') || 'MCP', resumo: '' };
    case 'web_search':
      return { nome: 'WebSearch', resumo: corta(item.query, 120) };
    case 'todo_list':
      return { nome: 'Todo', resumo: `${(item.items || []).length} item(s)` };
    default:
      return null;
  }
}

// one-line summary per tool_call of the Cursor CLI (`agent -p
// --output-format stream-json`): the body comes in `tool_call.<nome>ToolCall`
// with `args` and, on completed, `result` (key `success` = it worked; any
// other key = error). Returns {nome, resumo, erro, temResultado, saida}
// or null when the shape is not recognized.
const NOMES_TOOL_CURSOR = {
  shell: 'Bash',
  terminal: 'Bash',
  bash: 'Bash',
  read: 'Read',
  write: 'Write',
  edit: 'Edit',
  delete: 'Delete',
  ls: 'Ls',
  glob: 'Glob',
  grep: 'Grep',
  search: 'Grep',
  fetch: 'WebFetch',
  webfetch: 'WebFetch',
  websearch: 'WebSearch',
  mcp: 'MCP',
  todo: 'Todo',
};

export function resumoToolCallCursor(toolCall = {}) {
  const chave = Object.keys(toolCall).find((k) => k.endsWith('ToolCall'));
  if (!chave) return null;
  const corpo = toolCall[chave] || {};
  const args = corpo.args || {};
  const base = chave.slice(0, -'ToolCall'.length);
  const nome =
    NOMES_TOOL_CURSOR[base.toLowerCase()] || (base ? base[0].toUpperCase() + base.slice(1) : 'Tool');
  const rel = (p) => String(p || '').split('/').slice(-3).join('/');
  const str = (v) => (typeof v === 'string' && v ? v : null);
  // order: what matters to watch live — command > pattern/query > path
  // (in a grep with both pattern and path, hiding the pattern would hide the search)
  let resumo = '';
  const comando = str(args.command);
  const busca = str(args.pattern) ?? str(args.query) ?? str(args.url);
  const caminho = str(args.path) ?? str(args.file_path);
  if (comando) resumo = corta(comando, 200);
  else if (busca) resumo = corta(busca, 120);
  else if (caminho) resumo = rel(caminho);
  else {
    const chaves = Object.keys(args);
    if (chaves.length) resumo = corta(`${chaves[0]}: ${JSON.stringify(args[chaves[0]])}`, 160);
  }
  const resultado = corpo.result;
  const temResultado = resultado != null && typeof resultado === 'object';
  const erro = temResultado && !('success' in resultado);
  // readable output when the result carries text (the shape varies per tool)
  let saida = null;
  if (temResultado) {
    const dono = erro ? Object.values(resultado)[0] : resultado.success;
    if (typeof dono === 'string') saida = dono;
    else if (dono && typeof dono === 'object') {
      const texto = dono.output ?? dono.stdout ?? dono.content ?? dono.message ?? null;
      if (typeof texto === 'string') saida = texto;
      else if (erro) saida = corta(JSON.stringify(dono), 300);
    }
  }
  return { nome, resumo, erro, temResultado, saida };
}

function textoDeConteudo(conteudo) {
  if (typeof conteudo === 'string') return conteudo;
  if (Array.isArray(conteudo)) {
    return conteudo
      .map((c) => (typeof c === 'string' ? c : c && c.type === 'text' ? c.text : ''))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

// Turns the raw NDJSON into a timeline. `desde` = lines already read
// (incremental reading); also returns the total for the next request.
export function resumirStream(texto, { desde = 0 } = {}) {
  const linhas = String(texto || '').split('\n').filter((l) => l.trim());
  const novas = linhas.slice(desde);
  const itens = [];
  let resumo = null;
  let pensando = null;
  let turnosCodex = 0;

  for (const linha of novas) {
    let e;
    try {
      e = JSON.parse(linha);
    } catch {
      itens.push({ tipo: 'cru', texto: corta(linha, 300) });
      continue;
    }
    if (e.type === 'system' && e.subtype === 'init') {
      itens.push({ tipo: 'inicio', modelo: e.model, sessao: String(e.session_id || '').slice(0, 8) });
    } else if (e.type === 'system' && e.subtype === 'thinking_tokens') {
      // aggregate: one growing "thinking" item instead of dozens of lines
      if (pensando) pensando.tokens = e.estimated_tokens;
      else {
        pensando = { tipo: 'pensando', tokens: e.estimated_tokens, texto: '' };
        itens.push(pensando);
      }
    } else if (e.type === 'assistant' && e.message) {
      for (const c of e.message.content || []) {
        if (c.type === 'tool_use') {
          pensando = null;
          itens.push({
            tipo: 'ferramenta',
            nome: c.name,
            resumo: resumoFerramenta(c.name, c.input || {}),
            detalhe: corta(JSON.stringify(c.input || {}, null, 2), 1200),
          });
        } else if (c.type === 'thinking') {
          const t = String(c.thinking || '');
          if (t.trim()) {
            // text available (not always: headless usually comes redacted)
            if (pensando) pensando.texto = corta(t, 1200);
            else itens.push({ tipo: 'pensando', tokens: null, texto: corta(t, 1200) });
          }
        } else if (c.type === 'text' && String(c.text || '').trim()) {
          pensando = null;
          itens.push({ tipo: 'texto', texto: corta(c.text, 1200) });
        }
      }
    } else if (e.type === 'user' && e.message) {
      for (const c of e.message.content || []) {
        if (c.type === 'tool_result') {
          pensando = null;
          itens.push({
            tipo: 'saida',
            erro: Boolean(c.is_error),
            texto: corta(textoDeConteudo(c.content), 600),
          });
        }
      }
    } else if (e.type === 'result') {
      pensando = null;
      resumo = {
        status: e.is_error ? 'error' : e.subtype === 'success' ? 'success' : String(e.subtype || ''),
        duracaoMs: e.duration_ms ?? null,
        turnos: e.num_turns ?? null,
        custoUsd: e.total_cost_usd ?? null,
        tokensSaida: e.usage?.output_tokens ?? null,
        tokensEntrada: e.usage?.input_tokens ?? null,
      };
      itens.push({ tipo: 'fim', ...resumo, texto: corta(e.result, 600) });
    } else if (e.type === 'tool_call' && e.subtype === 'completed' && e.tool_call) {
      // Cursor CLI: the tool arrives as tool_call (started/completed); only
      // the completed one enters the timeline — the started would be a duplicate
      const fer = resumoToolCallCursor(e.tool_call);
      if (fer) {
        pensando = null;
        itens.push({
          tipo: 'ferramenta',
          nome: fer.nome,
          resumo: fer.resumo,
          detalhe: corta(JSON.stringify(e.tool_call, null, 2), 1200),
        });
        // as in codex, call and result arrive together — the parser splits
        // them so the timeline looks like claude's (tool + output)
        if (fer.saida != null || fer.erro) {
          itens.push({ tipo: 'saida', erro: fer.erro, texto: corta(fer.saida ?? '', 600) });
        }
      }
    } else if (e.type === 'thread.started') {
      // codex exec --json: session start
      itens.push({ tipo: 'inicio', modelo: e.model || null, sessao: String(e.thread_id || '').slice(0, 8) });
    } else if (e.type === 'item.completed' && e.item) {
      const item = e.item;
      if (item.type === 'reasoning') {
        const t = String(item.text || '');
        if (t.trim()) {
          if (pensando) pensando.texto = corta(t, 1200);
          else {
            pensando = { tipo: 'pensando', tokens: null, texto: corta(t, 1200) };
            itens.push(pensando);
          }
        }
      } else if (item.type === 'agent_message') {
        pensando = null;
        if (String(item.text || '').trim()) itens.push({ tipo: 'texto', texto: corta(item.text, 1200) });
      } else if (item.type === 'error') {
        pensando = null;
        itens.push({ tipo: 'saida', erro: true, texto: corta(item.message, 600) });
      } else {
        const fer = resumoItemCodex(item);
        if (fer) {
          pensando = null;
          itens.push({
            tipo: 'ferramenta',
            nome: fer.nome,
            resumo: fer.resumo,
            detalhe: corta(JSON.stringify(item, null, 2), 1200),
          });
          // as in codex, command and output arrive in the SAME item — the
          // parser splits them so the timeline looks like claude's (tool + output)
          if (item.type === 'command_execution' && item.aggregated_output != null) {
            itens.push({
              tipo: 'saida',
              erro: item.exit_code != null && item.exit_code !== 0,
              texto: corta(item.aggregated_output, 600),
            });
          }
        }
      }
    } else if (e.type === 'turn.completed' || e.type === 'turn.failed') {
      pensando = null;
      turnosCodex += 1;
      resumo = {
        status: e.type === 'turn.failed' ? 'error' : 'success',
        duracaoMs: null,
        turnos: turnosCodex,
        custoUsd: null,
        tokensSaida: e.usage?.output_tokens ?? null,
        tokensEntrada: e.usage?.input_tokens ?? null,
      };
      itens.push({ tipo: 'fim', ...resumo, texto: corta(e.error?.message || '', 600) });
    } else if (e.type === 'error') {
      pensando = null;
      itens.push({ tipo: 'saida', erro: true, texto: corta(e.message, 600) });
    }
  }

  return { itens, total: linhas.length, resumo };
}

export function lerStream(runId, chave, { desde = 0 } = {}) {
  const caminho = caminhoStream(runId, chave);
  if (!existsSync(caminho)) return { itens: [], total: 0, resumo: null, existe: false };
  return { ...resumirStream(readFileSync(caminho, 'utf-8'), { desde }), existe: true };
}

// streams recorded for an execution (diagnostic, even without events)
export function streamsDaExecucao(runId) {
  const dir = path.join(caminhos().streams, runId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => ({ chave: f.replace(/\.jsonl$/, ''), mtime: statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
}
