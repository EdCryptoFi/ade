// Lessons layer — the project learns from its own signals.
//
// The split that keeps this alive: the agent brings the JUDGMENT (phrasing
// the general rule that would prevent recurrence); the engine owns everything
// MECHANICAL — backing against the signal history, dedup by normalization,
// recurrence across distinct features, candidate→confirmed promotion,
// penalty→quarantine, pruning and rendering. Manual bookkeeping is exactly
// what rots a lessons file, so it doesn't exist here.
//
// Selectivity is mechanical, not opinion:
//   1. lesson without a recorded signal in the history → rejected (LICAO_SEM_LASTRO);
//   2. only lessons corroborated in >= limiarPromocao distinct features become
//      confirmed — and only confirmed ones are loaded as a guide;
//   3. candidates not corroborated within the window are pruned;
//   4. listing has a fixed ceiling — context cost doesn't grow with the repo.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { buscarSinal, refsDisponiveis, SINAIS_DEFAULTS } from './sinais.js';

export const LICOES_DEFAULTS = {
  limiarPromocao: 2,
  limiarQuarentena: 2,
  janelaDias: SINAIS_DEFAULTS.janelaDias,
  limiteListagem: 10,
  maxSinais: SINAIS_DEFAULTS.maxSinais,
};

export const LICAO_STATUSES = ['candidata', 'confirmada', 'quarentena'];

const MAX_TEXTO = 280;
const MAX_EVIDENCIAS = 5;

function agora() {
  return new Date().toISOString();
}

function caminhoStore(specRoot) {
  return path.join(specRoot, 'licoes.json');
}

function caminhoRender(specRoot) {
  return path.join(specRoot, 'LICOES.md');
}

export function carregarLicoes(specRoot) {
  const file = caminhoStore(specRoot);
  if (!existsSync(file)) return { schema: 1, proximoId: 1, licoes: [] };
  try {
    const data = JSON.parse(readFileSync(file, 'utf-8'));
    if (!Array.isArray(data.licoes)) data.licoes = [];
    if (!Number.isInteger(data.proximoId)) data.proximoId = data.licoes.length + 1;
    return data;
  } catch {
    throw new Error(`${file} corrupted — restore it from git or delete it to start over`);
  }
}

export function salvarLicoes(specRoot, data) {
  mkdirSync(specRoot, { recursive: true });
  writeFileSync(caminhoStore(specRoot), `${JSON.stringify(data, null, 2)}\n`);
  writeFileSync(caminhoRender(specRoot), renderLicoes(data));
}

// Dedup key: lowercase, no accents, no punctuation, collapsed whitespace.
// Exact-after-normalization, no semantics — that's why the phrasing must be
// canonical and terse (two lessons saying the same thing must READ the same).
function normalizar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pad3(n) {
  return String(n).padStart(3, '0');
}

// CLI flags without a value arrive as `true` — treat any non-string as absent
// instead of breaking.
function campo(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

export function adicionarLicao(data, sinaisData, entrada, cfg = LICOES_DEFAULTS) {
  const texto = campo(entrada.texto);
  const sinal = campo(entrada.sinal);
  const feature = campo(entrada.feature);
  const fonte = campo(entrada.fonte);
  const escopo = campo(entrada.escopo) || null;

  if (!texto) return { erro: 'missing --texto: the general rule, in one actionable sentence' };
  if (texto.length > MAX_TEXTO) {
    return {
      erro: `text has ${texto.length} characters — a lesson is ONE general, actionable sentence (max ${MAX_TEXTO})`,
    };
  }
  if (!sinal) return { erro: 'missing --sinal: the finding/failure code that motivated the lesson' };
  if (!feature) return { erro: 'missing --feature: the feature where the signal happened' };
  if (!fonte) return { erro: 'missing --fonte: the signal\'s ID (AC-xxx, T-xxx, P-xxx...) or file' };

  const lastro = buscarSinal(sinaisData, { sinal, feature, fonte });
  if (!lastro) {
    const refs = refsDisponiveis(sinaisData, { sinal, feature });
    const dica = refs.length
      ? `refs recorded for ${sinal} in ${feature}: ${refs.slice(0, 8).join(', ')}${refs.length > 8 ? ` (+${refs.length - 8})` : ''}`
      : `no ${sinal} signal recorded for ${feature} — the history is only written by audit/verify`;
    return {
      erro: `LICAO_SEM_LASTRO: no signal matches (${sinal}, ${feature}, ${fonte}). A lesson without a real signal is opinion — the engine rejects it. ${dica}`,
    };
  }

  const evidencia = {
    fonte: lastro.ref,
    feature,
    quando: agora(),
    gitRev: lastro.gitRev || null,
  };

  const chave = `${sinal}::${normalizar(texto)}`;
  const existente = data.licoes.find((l) => l.chave === chave);

  if (existente) {
    if (existente.status === 'quarentena') {
      return {
        erro: `${existente.id} is in quarantine (it was applied and the failure recurred) — review with the user before re-activating`,
      };
    }
    if (!existente.features.includes(feature)) existente.features.push(feature);
    existente.recorrencia = existente.features.length;
    existente.evidencias = [...existente.evidencias, evidencia].slice(-MAX_EVIDENCIAS);
    existente.ultimaVez = evidencia.quando;
    if (escopo && !existente.escopo) existente.escopo = escopo;
    if (existente.status === 'candidata' && existente.recorrencia >= cfg.limiarPromocao) {
      existente.status = 'confirmada';
      return { licao: existente, evento: 'promovida' };
    }
    return { licao: existente, evento: 'reforcada' };
  }

  const licao = {
    id: `L-${pad3(data.proximoId)}`,
    texto,
    chave,
    sinal,
    escopo,
    status: 'candidata',
    recorrencia: 1,
    features: [feature],
    evidencias: [evidencia],
    penalidades: 0,
    criadaEm: evidencia.quando,
    ultimaVez: evidencia.quando,
  };
  data.proximoId += 1;
  data.licoes.push(licao);
  return { licao, evento: 'criada' };
}

// Pruning: a candidate that didn't corroborate within the window leaves the store.
export function podarLicoes(data, cfg = LICOES_DEFAULTS) {
  const corte = Date.now() - cfg.janelaDias * 24 * 60 * 60 * 1000;
  const removidas = [];
  data.licoes = data.licoes.filter((l) => {
    const estagnada =
      l.status === 'candidata' &&
      l.recorrencia < cfg.limiarPromocao &&
      Date.parse(l.ultimaVez) < corte;
    if (estagnada) removidas.push(l.id);
    return !estagnada;
  });
  return removidas;
}

function escopoCasa(escopoLicao, filtro) {
  if (!filtro) return true;
  if (!escopoLicao) return false;
  return escopoLicao === filtro || escopoLicao.startsWith(`${filtro}/`);
}

export function listarLicoes(data, opts = {}) {
  const status = opts.status || 'confirmada';
  const limite = opts.limite ?? LICOES_DEFAULTS.limiteListagem;
  const query = opts.query ? normalizar(opts.query) : null;

  return data.licoes
    .filter((l) => status === 'todas' || l.status === status)
    .filter((l) => escopoCasa(l.escopo, opts.escopo))
    .filter(
      (l) =>
        !query ||
        normalizar(`${l.texto} ${l.sinal} ${l.escopo || ''}`).includes(query)
    )
    .sort(
      (a, b) =>
        b.recorrencia - a.recorrencia || Date.parse(b.ultimaVez) - Date.parse(a.ultimaVez)
    )
    .slice(0, limite);
}

export function penalizarLicao(data, id, cfg = LICOES_DEFAULTS) {
  const licao = data.licoes.find((l) => l.id === id);
  if (!licao) return { erro: `lesson ${id} does not exist` };
  if (licao.status !== 'confirmada') {
    return {
      erro: `${id} is "${licao.status}" — only confirmed lessons are applied as a guide, so only they can fail when applied`,
    };
  }
  licao.penalidades += 1;
  if (licao.penalidades >= cfg.limiarQuarentena) {
    licao.status = 'quarentena';
    return { licao, evento: 'quarentenada' };
  }
  return { licao, evento: 'penalizada' };
}

// Mechanical mining: signals that recurred across distinct features and still
// have few (or no) associated lessons. The engine points WHERE a lesson is
// worth writing; the judgment of HOW to phrase it remains the agent's.
export function sugerirLicoes(data, sinaisData, cfg = LICOES_DEFAULTS, opts = {}) {
  const limite = opts.limite ?? 5;
  const porCodigo = new Map();
  for (const s of Object.values(sinaisData.sinais)) {
    let g = porCodigo.get(s.codigo);
    if (!g) {
      g = { codigo: s.codigo, features: new Set(), refs: new Set(), ocorrencias: 0 };
      porCodigo.set(s.codigo, g);
    }
    if (s.feature !== '—') g.features.add(s.feature);
    if (s.ref !== '—') g.refs.add(s.ref);
    g.ocorrencias += s.ocorrencias;
  }

  return [...porCodigo.values()]
    .filter((g) => g.features.size >= cfg.limiarPromocao)
    .map((g) => ({
      sinal: g.codigo,
      features: [...g.features].sort(),
      refs: [...g.refs].slice(0, 8),
      ocorrencias: g.ocorrencias,
      licoesExistentes: data.licoes.filter(
        (l) => l.sinal === g.codigo && l.status !== 'quarentena'
      ).length,
    }))
    .sort(
      (a, b) =>
        a.licoesExistentes - b.licoesExistentes ||
        b.features.length - a.features.length ||
        b.ocorrencias - a.ocorrencias
    )
    .slice(0, limite);
}

export function renderLicoes(data) {
  const linhas = [];
  linhas.push('# LESSONS — maintained by the engine (`onp-spec licoes`)');
  linhas.push('');
  linhas.push('> Do not edit by hand: any engine write overwrites this file.');
  linhas.push('> Canonical state in `.spec/licoes.json`; mutation only via `onp-spec licoes`.');
  linhas.push('');

  const porStatus = { confirmada: [], candidata: [], quarentena: [] };
  for (const l of data.licoes) (porStatus[l.status] || porStatus.candidata).push(l);

  const bloco = (titulo, itens, nota) => {
    linhas.push(`## ${titulo}`);
    linhas.push('');
    linhas.push(nota);
    linhas.push('');
    if (!itens.length) {
      linhas.push('_none_');
      linhas.push('');
      return;
    }
    for (const l of [...itens].sort((a, b) => a.id.localeCompare(b.id))) {
      linhas.push(`### ${l.id} — ${l.texto}`);
      const escopo = l.escopo ? ` · scope: \`${l.escopo}\`` : '';
      linhas.push(
        `- signal: \`${l.sinal}\` · recurrence: ${l.recorrencia} feature(s)${escopo} · penalties: ${l.penalidades}`
      );
      linhas.push(`- features: ${l.features.join(', ')}`);
      const ev = l.evidencias[l.evidencias.length - 1];
      if (ev) linhas.push(`- last evidence: ${ev.fonte} (${ev.feature}, ${ev.quando})`);
      linhas.push('');
    }
  };

  bloco(
    'Confirmed — load into Specifying/Designing',
    porStatus.confirmada,
    'Corroborated across multiple features. Apply as a guide.'
  );
  bloco(
    'Candidates — under observation, DO NOT apply yet',
    porStatus.candidata,
    'Seen in a single feature. Recorded, not trusted.'
  );
  bloco(
    'Quarantined — applied and failed, ignore',
    porStatus.quarentena,
    'The failure recurred even with the lesson applied. Review is up to the user.'
  );

  return `${linhas.join('\n').trimEnd()}\n`;
}
