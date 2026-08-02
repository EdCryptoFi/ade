// Signals history — the engine's mechanical memory.
//
// Every audit finding and every verify failure/skip becomes a persisted signal
// in .spec/verification/sinais.json. This history is what gives LASTRO
// (backing) to lessons: `licoes add` only accepts a lesson if the cited signal
// actually happened in this project. Without a registered signal, a lesson is
// opinion — rejected.
//
// The file is keyed by (code, feature, ref), not append-only: its size grows
// with the number of distinct FAILURE POINTS, not with the number of runs —
// which keeps it bounded even with hundreds of features.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

export const SINAIS_DEFAULTS = { janelaDias: 90, maxSinais: 20000 };

const RE_REF = /(?:US|AC|ASM|Q|T|P)-\d{3,}/;

function agora() {
  return new Date().toISOString();
}

function caminhoSinais(specRoot) {
  return path.join(specRoot, 'verification', 'sinais.json');
}

export function carregarSinais(specRoot) {
  const file = caminhoSinais(specRoot);
  if (!existsSync(file)) return { schema: 1, sinais: {} };
  try {
    const data = JSON.parse(readFileSync(file, 'utf-8'));
    if (!data.sinais || typeof data.sinais !== 'object') data.sinais = {};
    return data;
  } catch {
    return { schema: 1, sinais: {} };
  }
}

// Keeps the history bounded: drops signals outside the window and, if still
// over the cap, keeps only the most recent ones.
function compactar(data, opts) {
  const janelaDias = opts.janelaDias ?? SINAIS_DEFAULTS.janelaDias;
  const max = opts.maxSinais ?? SINAIS_DEFAULTS.maxSinais;
  const corte = Date.now() - janelaDias * 24 * 60 * 60 * 1000;
  let entradas = Object.entries(data.sinais).filter(
    ([, s]) => Date.parse(s.ultimaVez) >= corte
  );
  if (entradas.length > max) {
    entradas.sort((a, b) => Date.parse(b[1].ultimaVez) - Date.parse(a[1].ultimaVez));
    entradas = entradas.slice(0, max);
  }
  data.sinais = Object.fromEntries(entradas);
}

export function salvarSinais(specRoot, data, opts = {}) {
  compactar(data, opts);
  const file = caminhoSinais(specRoot);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function registrar(data, { codigo, feature, ref, gitRev }) {
  const chave = `${codigo}::${feature || '—'}::${ref || '—'}`;
  const existente = data.sinais[chave];
  if (existente) {
    existente.ocorrencias += 1;
    existente.ultimaVez = agora();
    if (gitRev) existente.gitRev = gitRev;
  } else {
    data.sinais[chave] = {
      codigo,
      feature: feature || '—',
      ref: ref || '—',
      ocorrencias: 1,
      primeiraVez: agora(),
      ultimaVez: agora(),
      gitRev: gitRev || null,
    };
  }
}

// Checkable ref of a finding: the cited canonical ID (explicit field or the
// first one in the message); otherwise the pointed file.
function refDoAchado(f) {
  if (f.principle) return f.principle;
  const m = (f.message || '').match(RE_REF);
  if (m) return m[0];
  return f.file || '—';
}

export function registrarAchados(specRoot, findings, { gitRev = null, ...opts } = {}) {
  if (!findings.length || !existsSync(specRoot)) return 0;
  const data = carregarSinais(specRoot);
  for (const f of findings) {
    registrar(data, { codigo: f.code, feature: f.feature, ref: refDoAchado(f), gitRev });
  }
  salvarSinais(specRoot, data, opts);
  return findings.length;
}

export function registrarVerify(specRoot, record, opts = {}) {
  const eventos = [];
  for (const [acId, r] of Object.entries(record.results || {})) {
    if (r.status === 'fail') eventos.push({ codigo: 'VERIFY_FAILED', ref: acId });
    else if (r.status === 'skip') eventos.push({ codigo: 'VERIFY_SKIPPED', ref: acId });
  }
  for (const [pId, r] of Object.entries(record.principles || {})) {
    if (r.status !== 'pass') eventos.push({ codigo: 'VERIFY_FAILED', ref: pId });
  }
  if (!eventos.length || !existsSync(specRoot)) return 0;
  const data = carregarSinais(specRoot);
  for (const e of eventos) {
    registrar(data, { ...e, feature: record.feature, gitRev: record.gitRev });
  }
  salvarSinais(specRoot, data, opts);
  return eventos.length;
}

// The signal that backs a lesson: same code, same feature (or a global signal,
// without feature) and a source matching the registered ref.
export function buscarSinal(data, { sinal, feature, fonte }) {
  if (!fonte) return null;
  const candidatos = Object.values(data.sinais).filter(
    (s) => s.codigo === sinal && (s.feature === feature || s.feature === '—')
  );
  const exato = candidatos.find((s) => s.ref === fonte);
  if (exato) return exato;
  if (fonte.length < 4) return null;
  return (
    candidatos.find(
      (s) => s.ref !== '—' && (fonte.includes(s.ref) || s.ref.includes(fonte))
    ) || null
  );
}

export function refsDisponiveis(data, { sinal, feature }) {
  return [
    ...new Set(
      Object.values(data.sinais)
        .filter((s) => s.codigo === sinal && (s.feature === feature || s.feature === '—'))
        .map((s) => s.ref)
    ),
  ];
}
