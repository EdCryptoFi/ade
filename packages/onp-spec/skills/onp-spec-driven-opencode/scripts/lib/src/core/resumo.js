// General progress summary — the text the agent posts to the chat and the
// executor prints to the terminal about every ~1 minute during execution.
//
// Two origins, always labeled:
//   'ai'     — written by a model (the headless executor calls `claude -p`,
//              `codex exec` or the Cursor CLI `agent -p`; on Antigravity it
//              is the agent itself that writes it) and recorded with
//              `onp-spec resumo <feature> --gravar --texto "..."`
//   'engine' — deterministic, assembled from the ledger tree. The always
//              available fallback: zero dependencies, zero network, zero model.
//
// Freshness rule: only an AI summary younger than 2 minutes counts; past that
// (or with no summary recorded), the engine's wins — a stale summary claiming
// "running" would be a lie.

import { openSync, closeSync, readSync, statSync, existsSync } from 'fs';
import {
  registrarEvento,
  caminhoStream,
  resumoFerramenta,
  resumoItemCodex,
  resumoToolCallCursor,
} from './ledger.js';

export const FRESCOR_IA_MS = 2 * 60 * 1000;

// ── last action of a task (cheap tail of the NDJSON stream) ────────────────

export function ultimaAcao(runId, chave, { maxBytes = 4096 } = {}) {
  const caminho = caminhoStream(runId, chave);
  if (!existsSync(caminho)) return null;
  let texto;
  let cortado = false;
  try {
    const st = statSync(caminho);
    const fd = openSync(caminho, 'r');
    const inicio = Math.max(0, st.size - maxBytes);
    const buf = Buffer.alloc(Math.min(maxBytes, st.size));
    readSync(fd, buf, 0, buf.length, inicio);
    closeSync(fd);
    texto = buf.toString('utf-8');
    cortado = inicio > 0;
  } catch {
    return null;
  }
  const linhas = texto.split('\n').filter((l) => l.trim());
  if (cortado && linhas.length) linhas.shift(); // first line may be truncated
  for (let i = linhas.length - 1; i >= 0; i--) {
    let e;
    try {
      e = JSON.parse(linhas[i]);
    } catch {
      continue;
    }
    if (e.type === 'assistant' && e.message) {
      for (const c of [...(e.message.content || [])].reverse()) {
        if (c.type === 'tool_use') return `${c.name}: ${resumoFerramenta(c.name, c.input || {})}`;
        if (c.type === 'text' && String(c.text || '').trim()) {
          const t = String(c.text).trim().split('\n')[0];
          return t.length > 120 ? `${t.slice(0, 120)}…` : t;
        }
      }
    }
    // codex exec --json: item.started shows the command still in progress
    if ((e.type === 'item.completed' || e.type === 'item.started') && e.item) {
      const fer = resumoItemCodex(e.item);
      if (fer) return fer.resumo ? `${fer.nome}: ${fer.resumo}` : fer.nome;
      if (e.item.type === 'agent_message' && String(e.item.text || '').trim()) {
        const t = String(e.item.text).trim().split('\n')[0];
        return t.length > 120 ? `${t.slice(0, 120)}…` : t;
      }
    }
    // Cursor CLI: tool_call started shows the tool still in progress
    if (e.type === 'tool_call' && e.tool_call) {
      const fer = resumoToolCallCursor(e.tool_call);
      if (fer) return fer.resumo ? `${fer.nome}: ${fer.resumo}` : fer.nome;
    }
  }
  return null;
}

// ── deterministic summary (the engine reports what it sees in the ledger) ──

function fraseExecucao(ex) {
  const frases = [];
  const rotulo = `"${ex.feature}" (${ex.projeto})`;
  frases.push(`${rotulo}: ${ex.concluidas} of ${ex.total} task(s) done.`);

  const executando = [];
  for (const fx of ex.faixas) {
    for (const t of fx.tarefas) {
      if (t.estado === 'running') executando.push({ faixa: fx.id, t });
    }
  }
  for (const t of ex.sequenciais) {
    if (t.estado === 'running') executando.push({ faixa: 'seq', t });
  }
  for (const { faixa, t } of executando) {
    const acao = t.stream ? ultimaAcao(ex.runId, t.stream) : null;
    frases.push(
      `Running now: ${t.id} (${t.titulo}) in ${faixa}${acao ? ` — last action: ${acao}` : ''}.`
    );
  }

  const falhas = ex.faixas.filter((f) => f.estado === 'failed' || f.estado === 'conflict');
  for (const fx of falhas) {
    frases.push(
      fx.estado === 'conflict'
        ? `Lane ${fx.id} stopped on a MERGE CONFLICT — needs resolution by the agent or by you.`
        : `Lane ${fx.id} failed — ask the agent to re-run it (--faixa ${fx.id}).`
    );
  }

  if (!ex.rodando) {
    if (ex.fim === 0 && ex.gate.audit === 0 && !ex.gateDesatualizado) {
      frases.push('Done: spec and code aligned (audit exit 0).');
    } else if (ex.fim === 1) {
      frases.push('Finished with outstanding issues — see the gate and the lanes above.');
    } else if (ex.concluidas === ex.total && ex.total > 0 && ex.gate.audit == null) {
      frases.push('Tasks done, gate (verify + audit) still pending.');
    } else if (!executando.length) {
      frases.push('Paused right now — no task running.');
    }
  }
  return frases;
}

export function resumoDeterministico(projetos) {
  const execucoes = projetos.flatMap((p) => p.execucoes);
  if (!execucoes.length) {
    return 'No execution in the ledger yet. Generate a plan with `onp-spec plano <feature>` and ask the agent to run it.';
  }
  // relevance: everything running; if nothing runs, the most recent execution
  const rodando = execucoes.filter((ex) => ex.rodando);
  const alvo = rodando.length ? rodando : [execucoes[0]];
  return alvo.flatMap(fraseExecucao).join(' ');
}

// richer context for the narrator model (the executor's `claude -p`):
// the engine summary plus the last actions per task currently running
export function contextoParaIa(projetos) {
  const L = [`Mechanical state: ${resumoDeterministico(projetos)}`];
  for (const p of projetos) {
    for (const ex of p.execucoes) {
      if (!ex.rodando) continue;
      for (const fx of ex.faixas) {
        L.push(`- ${ex.feature}/${fx.id}: ${fx.estado}${fx.tentativa > 1 ? ` (attempt ${fx.tentativa})` : ''}`);
        for (const t of fx.tarefas) {
          const acao = t.stream ? ultimaAcao(ex.runId, t.stream) : null;
          L.push(`  - ${t.id} [${t.estado}] ${t.titulo}${acao ? ` · last action: ${acao}` : ''}`);
        }
      }
      for (const t of ex.sequenciais) L.push(`  - seq ${t.id} [${t.estado}] ${t.titulo}`);
    }
  }
  return L.join('\n');
}

// ── progress table (markdown, ready for the chat) ──────────────────────────
//
// The agent posts THIS table in the chat about every ~1 minute while the
// execution runs: one row per task, with where it runs (lane/seq), the state
// right now and the last action seen in the stream. Cells are single-line
// text (pipes and breaks are sanitized so the table doesn't break).

const ICONE_ESTADO = {
  pending: '⏳',
  running: '▶️',
  done: '✅',
  failed: '❌',
};

const celula = (s) =>
  String(s == null ? '' : s)
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '\\|')
    .trim() || '—';

function tabelaExecucao(ex) {
  const L = [];
  const modo = ex.faixas.length ? `${ex.faixas.length} lane(s) in parallel` : 'sequential';
  L.push(
    `**${ex.feature}** (${ex.projeto}) — ${ex.concluidas} of ${ex.total} task(s) done · ${modo}` +
      (ex.rodando ? ' · RUNNING' : '')
  );
  L.push('');
  L.push('| task | title | where | status | last action |');
  L.push('|---|---|---|---|---|');
  const linha = (t, onde) => {
    const icone = ICONE_ESTADO[t.estado] || '·';
    const acao = t.estado === 'running' && t.stream ? ultimaAcao(ex.runId, t.stream) : null;
    L.push(`| ${t.id} | ${celula(t.titulo)} | ${onde} | ${icone} ${t.estado} | ${celula(acao)} |`);
  };
  for (const fx of ex.faixas) for (const t of fx.tarefas) linha(t, fx.id);
  for (const t of ex.sequenciais) linha(t, 'seq');

  const rodape = [];
  for (const fx of ex.faixas) {
    if (fx.estado === 'conflict') rodape.push(`${fx.id} in MERGE CONFLICT`);
    else if (fx.estado === 'failed') rodape.push(`${fx.id} failed (re-run: --faixa ${fx.id})`);
  }
  if (ex.gate.verify != null) rodape.push(`verify exit ${ex.gate.verify}`);
  if (ex.gate.audit != null) rodape.push(`audit exit ${ex.gate.audit}${ex.gateDesatualizado ? ' (outdated)' : ''}`);
  if (rodape.length) {
    L.push('');
    L.push(rodape.join(' · '));
  }
  return L.join('\n');
}

export function tabelaAndamento(projetos) {
  const execucoes = projetos.flatMap((p) => p.execucoes);
  if (!execucoes.length) {
    return 'No execution in the ledger yet. Generate a plan with `onp-spec plano <feature>` and ask the agent to run it.';
  }
  // same relevance as the summary: everything running; if nothing runs, the most recent one
  const rodando = execucoes.filter((ex) => ex.rodando);
  const alvo = rodando.length ? rodando : [execucoes[0]];
  return alvo.map(tabelaExecucao).join('\n\n');
}

// ── the summary that counts RIGHT NOW (fresh AI > engine) ──────────────────

export function montarResumoAtual(projetos, { agora = Date.now() } = {}) {
  let ultimo = null;
  for (const p of projetos) {
    for (const ex of p.execucoes) {
      if (ex.resumo && (!ultimo || ex.resumo.ts > ultimo.ts)) ultimo = ex.resumo;
    }
  }
  if (ultimo && ultimo.origem === 'ai' && agora - new Date(ultimo.ts).getTime() < FRESCOR_IA_MS) {
    return ultimo;
  }
  return { texto: resumoDeterministico(projetos), origem: 'engine', ts: new Date(agora).toISOString() };
}

// ── recording (used by the executor and the agents) ────────────────────────

const MAX_TEXTO = 1200;

export function registrarResumo({ runId, texto, origem = 'engine' }) {
  const limpo = String(texto || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXTO);
  if (!runId || !limpo) return { erro: 'summary needs runId and text' };
  registrarEvento({ tipo: 'resumo', runId, texto: limpo, origem: origem === 'ai' ? 'ai' : 'engine' });
  return { texto: limpo, origem };
}

// target execution for `--gravar` without --run: the most recent running in scope
export function execucaoAlvo(projetos, { runId = null } = {}) {
  const execucoes = projetos.flatMap((p) => p.execucoes);
  if (runId) return execucoes.find((ex) => ex.runId === runId) || null;
  return execucoes.find((ex) => ex.rodando) || execucoes[0] || null;
}
