import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, statSync } from 'fs';
import path from 'path';
import os from 'os';
import { performance } from 'perf_hooks';
import { loadConfig } from '../src/config.js';
import { loadProject } from '../src/core/project.js';
import { auditProject } from '../src/core/audit.js';
import { carregarSinais, registrarAchados } from '../src/core/sinais.js';
import {
  carregarLicoes,
  salvarLicoes,
  adicionarLicao,
  listarLicoes,
  sugerirLicoes,
  LICOES_DEFAULTS,
} from '../src/core/licoes.js';

// Asaas-style scale: many domains, hundreds of features, thousands of
// signals. The layer's contract: FIXED context cost (capped listing),
// BOUNDED files (keyed history + compaction) and fast operations even with a
// huge repo. Time budgets are deliberately generous — what is being proven is
// the order of magnitude, not the hardware.

const roots = [];
after(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

const pad = (n) => String(n).padStart(4, '0');

function specGrande(feature, idx, acsPorFeature) {
  const us = `US-${pad(idx)}`;
  const acs = [];
  for (let k = 0; k < acsPorFeature; k++) {
    const ac = `AC-${pad(idx * 10 + k)}`;
    acs.push(`#### ${ac} — Critério ${k} de ${feature}

- **Dado** um estado inicial ${k}
- **Quando** a ação ${k} acontece
- **Então** o resultado ${k} é observável
`);
  }
  return `# Spec: ${feature}

> feature: ${feature}
> status: em-implementacao

## Histórias

### ${us} — História de ${feature}

Como usuário, quero ${feature}, para que funcione.

${acs.join('\n')}
## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
`;
}

test('huge project on disk: 120 features × 6 ACs — real audit turns into signals and lessons with backing', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'onpspec-escala-'));
  roots.push(root);
  const specRoot = path.join(root, '.spec');
  mkdirSync(path.join(specRoot, 'verification'), { recursive: true });

  const dominios = ['cobranca', 'pix', 'assinaturas', 'antecipacao', 'conta', 'cartao'];
  const FEATURES = 120;
  const ACS = 6;
  const features = [];
  for (let i = 1; i <= FEATURES; i++) {
    const feature = `${dominios[i % dominios.length]}-feature-${pad(i)}`;
    features.push(feature);
    const dir = path.join(specRoot, 'features', feature);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'spec.md'), specGrande(feature, i, ACS));
  }

  const t0 = performance.now();
  const project = loadProject(loadConfig(root));
  const audit = auditProject(project);
  const tAudit = performance.now() - t0;

  const semTeste = audit.findings.filter((f) => f.code === 'AC_SEM_TESTE');
  assert.equal(semTeste.length, FEATURES * ACS);

  const t1 = performance.now();
  registrarAchados(specRoot, audit.findings, LICOES_DEFAULTS);
  const tSinais = performance.now() - t1;

  const sinais = carregarSinais(specRoot);
  assert.ok(Object.keys(sinais.sinais).length >= FEATURES * ACS);

  const data = carregarLicoes(specRoot);
  const texto = 'Todo AC nasce com teste via scaffold antes de qualquer implementação';
  const t2 = performance.now();
  let promovida = null;
  for (let i = 0; i < 40; i++) {
    const feature = features[i];
    const fonte = `AC-${pad((i + 1) * 10)}`;
    const r = adicionarLicao(data, sinais, {
      texto,
      sinal: 'AC_SEM_TESTE',
      feature,
      fonte,
      escopo: feature.split('-')[0],
    });
    assert.ok(!r.erro, r.erro);
    if (r.evento === 'promovida') promovida = r.licao;
  }
  const tAdd = performance.now() - t2;

  assert.ok(promovida, 'recurrence in distinct features had to promote');
  assert.equal(promovida.status, 'confirmada');
  assert.equal(promovida.recorrencia, 40);
  assert.equal(promovida.evidencias.length, 5);

  const sugestoes = sugerirLicoes(data, sinais);
  assert.ok(sugestoes.some((s) => s.sinal === 'AC_SEM_TESTE' && s.features.length === FEATURES));

  salvarLicoes(specRoot, data);
  const relido = carregarLicoes(specRoot);
  assert.equal(relido.licoes.length, 1);

  assert.ok(tAudit < 15_000, `audit of ${FEATURES} features took ${tAudit}ms`);
  assert.ok(tSinais < 3_000, `registering ${audit.findings.length} findings took ${tSinais}ms`);
  assert.ok(tAdd < 3_000, `40 adds with backing took ${tAdd}ms`);
});

test('thousands of signals and hundreds of lessons: listing with fixed cost and bounded files', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'onpspec-escala-vol-'));
  roots.push(root);
  const specRoot = path.join(root, '.spec');
  mkdirSync(path.join(specRoot, 'verification'), { recursive: true });

  const FEATURES = 500;
  const achados = [];
  for (let i = 1; i <= FEATURES; i++) {
    const feature = `feature-${pad(i)}`;
    for (const code of ['AC_SEM_PROVA', 'VERIFY_OBSOLETO', 'Q_ABERTA']) {
      achados.push({
        code,
        severity: 'aviso',
        message: `AC-${pad(i)} pendente`,
        feature,
      });
    }
  }

  const t0 = performance.now();
  for (let rodada = 0; rodada < 3; rodada++) registrarAchados(specRoot, achados, LICOES_DEFAULTS);
  const tRodadas = performance.now() - t0;

  const sinais = carregarSinais(specRoot);
  const entradas = Object.values(sinais.sinais);
  assert.equal(entradas.length, FEATURES * 3, 'repeated rounds must not duplicate keys');
  assert.ok(entradas.every((s) => s.ocorrencias === 3));

  const data = carregarLicoes(specRoot);
  const t1 = performance.now();
  for (let i = 1; i <= 300; i++) {
    const r = adicionarLicao(data, sinais, {
      texto: `Regra número ${i} sobre prova de aceite antes de concluir`,
      sinal: 'AC_SEM_PROVA',
      feature: `feature-${pad(i)}`,
      fonte: `AC-${pad(i)}`,
      escopo: `dominio-${i % 12}`,
    });
    assert.ok(!r.erro, r.erro);
  }
  const tAdds = performance.now() - t1;
  assert.equal(data.licoes.length, 300);

  const t2 = performance.now();
  const listadas = listarLicoes(data, { status: 'todas' });
  const tList = performance.now() - t2;
  assert.equal(listadas.length, LICOES_DEFAULTS.limiteListagem);

  salvarLicoes(specRoot, data);
  const tamanhoLicoes = statSync(path.join(specRoot, 'licoes.json')).size;
  const tamanhoSinais = statSync(path.join(specRoot, 'verification', 'sinais.json')).size;
  assert.ok(tamanhoLicoes < 512 * 1024, `licoes.json at ${tamanhoLicoes} bytes`);
  assert.ok(tamanhoSinais < 2 * 1024 * 1024, `sinais.json at ${tamanhoSinais} bytes`);

  assert.ok(tRodadas < 6_000, `3 rounds × ${achados.length} findings took ${tRodadas}ms`);
  assert.ok(tAdds < 5_000, `300 adds took ${tAdds}ms`);
  assert.ok(tList < 100, `list over 300 lessons took ${tList}ms`);
});

test('the history cap holds the file even with tens of thousands of failure points', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'onpspec-escala-teto-'));
  roots.push(root);
  const specRoot = path.join(root, '.spec');
  mkdirSync(path.join(specRoot, 'verification'), { recursive: true });

  const achados = [];
  for (let i = 0; i < 8000; i++) {
    achados.push({
      code: 'ARQUIVO_ORFAO',
      severity: 'aviso',
      message: 'sem task',
      file: `src/modulo-${i}.js`,
    });
  }
  registrarAchados(specRoot, achados, { ...LICOES_DEFAULTS, maxSinais: 5000 });

  const sinais = carregarSinais(specRoot);
  assert.equal(Object.keys(sinais.sinais).length, 5000);
});
