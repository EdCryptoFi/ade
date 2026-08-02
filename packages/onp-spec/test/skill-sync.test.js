// Garante que o motor embarcado em CADA skill (claude, antigravity, codex e
// cursor) está sincronizado com src/ e templates/ — mata o drift silencioso
// (SK-5). Se este teste falhar: node tools/build-skill.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENTRY } from '../tools/build-skill.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = ['onp-spec-driven', 'onp-spec-driven-antigravity', 'onp-spec-driven-codex', 'onp-spec-driven-cursor'];

function walk(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.DS_Store') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, base));
    else out.push(path.relative(base, full));
  }
  return out.sort();
}

for (const skill of SKILLS) {
  const SCRIPTS = path.join(ROOT, 'skills', skill, 'scripts');

  test(`[${skill}] motor embarcado existe (rode: node tools/build-skill.mjs)`, () => {
    assert.ok(existsSync(SCRIPTS), `skills/${skill}/scripts/ não existe`);
  });

  test(`[${skill}] scripts/lib/src espelha src/ byte a byte`, () => {
    const srcFiles = walk(path.join(ROOT, 'src'));
    const libFiles = walk(path.join(SCRIPTS, 'lib', 'src'));
    assert.deepEqual(libFiles, srcFiles, 'lista de arquivos diverge — regenere o build');
    for (const rel of srcFiles) {
      assert.equal(
        readFileSync(path.join(SCRIPTS, 'lib', 'src', rel), 'utf-8'),
        readFileSync(path.join(ROOT, 'src', rel), 'utf-8'),
        `conteúdo diverge: ${rel} — rode node tools/build-skill.mjs`
      );
    }
  });

  test(`[${skill}] scripts/lib/templates espelha templates/ (sem agents/)`, () => {
    const tplFiles = walk(path.join(ROOT, 'templates')).filter((f) => !f.startsWith('agents/'));
    const libFiles = walk(path.join(SCRIPTS, 'lib', 'templates'));
    assert.deepEqual(libFiles, tplFiles);
    for (const rel of tplFiles) {
      assert.equal(
        readFileSync(path.join(SCRIPTS, 'lib', 'templates', rel), 'utf-8'),
        readFileSync(path.join(ROOT, 'templates', rel), 'utf-8'),
        `template diverge: ${rel}`
      );
    }
  });

  test(`[${skill}] entrypoint onp-spec.mjs é o gerado pelo build`, () => {
    assert.equal(readFileSync(path.join(SCRIPTS, 'onp-spec.mjs'), 'utf-8'), ENTRY);
  });
}

// A SKILL.md de cada skill declara seu agente (o init usa o marcador para não
// instalar a skill errada) e todas mantêm a MESMA versão (política: bump junto).
test('SKILL.md: marcador agent correto e versões alinhadas', () => {
  const frontmatter = (skill) =>
    readFileSync(path.join(ROOT, 'skills', skill, 'SKILL.md'), 'utf-8').split('---')[1];
  const claude = frontmatter('onp-spec-driven');
  const ag = frontmatter('onp-spec-driven-antigravity');
  const codex = frontmatter('onp-spec-driven-codex');
  const cursor = frontmatter('onp-spec-driven-cursor');
  assert.match(claude, /^\s*agent:\s*claude\s*$/m);
  assert.match(ag, /^\s*agent:\s*antigravity\s*$/m);
  assert.match(codex, /^\s*agent:\s*codex\s*$/m);
  assert.match(cursor, /^\s*agent:\s*cursor\s*$/m);
  const versao = (fm) => fm.match(/^\s*version:\s*(\S+)/m)?.[1];
  assert.equal(versao(claude), versao(ag), 'versões das skills divergem — bump junto');
  assert.equal(versao(claude), versao(codex), 'versões das skills divergem — bump junto');
  assert.equal(versao(claude), versao(cursor), 'versões das skills divergem — bump junto');
});

// O Cursor exige que o `name:` do frontmatter seja IGUAL ao nome da pasta
// instalada (.cursor/skills/onp-spec-driven) — senão a skill não carrega.
test('SKILL.md (cursor): name compatível com a pasta de instalação', () => {
  const frontmatter = readFileSync(
    path.join(ROOT, 'skills', 'onp-spec-driven-cursor', 'SKILL.md'),
    'utf-8'
  ).split('---')[1];
  assert.match(frontmatter, /^\s*name:\s*onp-spec-driven\s*$/m);
  assert.match(frontmatter, /^\s*description:\s*\S/m, 'description é obrigatória para a ativação automática');
});

// The anti-fraud rules of the contract are sacred: no skill can lose
// "never weaken/skip/delete a test" nor the graceful degradation (WEAK PROOF).
test('SKILL.md: contract and graceful degradation present in all four skills', () => {
  for (const skill of SKILLS) {
    const conteudo = readFileSync(path.join(ROOT, 'skills', skill, 'SKILL.md'), 'utf-8');
    assert.match(conteudo, /Never weaken, skip or delete a test/, `${skill}: contract rule 6 is missing`);
    assert.match(conteudo, /skip\/todo\) is not proof/, `${skill}: "skip is not proof" is missing`);
    assert.match(conteudo, /WEAK PROOF \(manual audit\)/, `${skill}: graceful degradation is missing`);
    assert.match(conteudo, /audit --ci` exits with code 0/, `${skill}: audit gate is missing`);
  }
});

// On codex, cost is the user's choice: the skill can NEVER lose the gate of
// confirming models/efforts before executing (a cheap license burns tokens
// with a strong model + high effort).
test('SKILL.md (codex): model and effort confirmation gate present', () => {
  const conteudo = readFileSync(path.join(ROOT, 'skills', 'onp-spec-driven-codex', 'SKILL.md'), 'utf-8');
  assert.match(conteudo, /MODEL and EFFORT are the USER's choice — confirm BEFORE\s+executing/);
  assert.match(conteudo, /Without this confirmation,\s+do not execute/);
  assert.match(conteudo, /Never\s+raise model\/effort without the user asking/);
  assert.match(conteudo, /--modelo gpt-5\.6-luna --esforco baixo/);
  assert.match(conteudo, /onp-spec tarefa <feature> <T-xxx> --modelo/);
});

// On cursor, same: claude-*/gpt-* models are billed per use on the user's
// plan — the model confirmation gate is sacred, and the skill needs to be
// honest about effort (there is no CLI flag; it goes in the slug).
test('SKILL.md (cursor): model confirmation gate and effort honesty', () => {
  const conteudo = readFileSync(path.join(ROOT, 'skills', 'onp-spec-driven-cursor', 'SKILL.md'), 'utf-8');
  assert.match(conteudo, /The MODEL of each task is the USER's choice — confirm BEFORE\s+executing/);
  assert.match(conteudo, /Without this confirmation,\s+do not execute/);
  assert.match(conteudo, /Never swap a model for a\s+more expensive one without the user asking/);
  assert.match(conteudo, /--modelo composer/);
  assert.match(conteudo, /onp-spec tarefa <feature> <T-xxx> --modelo/);
  // honesty: the Cursor CLI has no effort flag — the slug decides
  assert.match(conteudo, /the Cursor CLI has no effort flag/);
  assert.match(conteudo, /gpt-5\.6-terra-high/);
  // and the executor depends on --force (without it, print mode doesn't write)
  assert.match(conteudo, /--force/);
  assert.match(conteudo, /\.cursor\/cli\.json/);
});
