// Security regression tests for the onp-spec engine: path traversal, shell
// injection in generated artifacts, ReDoS/regex injection and unsafe deletion.
// Each test pins a hardening decision — if a fix regresses, these fail.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig, normalizeSpecDir } from '../src/config.js';
import { walkFiles } from '../src/parsers/annotations.js';
import { caminhoStream } from '../src/core/ledger.js';
import { renderPlanoSh, montarPlano } from '../src/core/plano.js';
import { containedPath } from '../src/cli.js';

function makeDir(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'onpspec-seg-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

function realPlan({ repoName = 'safe-repo', feature = 'pagamentos' } = {}) {
  const root = makeDir({});
  const proj = {
    config: {
      specDir: '.spec',
      rootDir: root,
      testCommand: 'node --test',
      paralelo: {
        permissionMode: 'acceptEdits$(touch /tmp/y)',
        allowedTools: null,
        sandbox: 'workspace-write',
        model: 'claude-sonnet-5',
        esforco: 'medium',
        resumoModel: 'claude-haiku-4-5',
        maxParalelas: 3,
      },
    },
    features: [
      {
        name: feature,
        spec: { stories: [] },
        tasks: { tasks: [{ id: 'T-001', title: 'T 1', status: 'pending', files: ['src/a.js'], refs: ['AC-001'], line: 3 }] },
      },
    ],
  };
  const plan = montarPlano(proj, feature, { agent: 'claude', enginePath: root });
  plan.repoName = repoName;
  plan.feature = feature;
  return plan;
}

// ── config: specDir / glob containment ────────────────────────────────────

test('specDir with ".." or absolute path is rejected (containment)', () => {
  const root = makeDir({});
  assert.throws(() => normalizeSpecDir('../etc', root), /cannot contain "\.\."/);
  assert.throws(() => normalizeSpecDir('/etc', root), /absolute/);
  assert.throws(() => normalizeSpecDir('../..', root), /cannot contain "\.\."/);
  assert.equal(normalizeSpecDir('.spec', root), '.spec');
  assert.equal(normalizeSpecDir('spec/sub', root), 'spec/sub');
});

test('config specDir traversal from onpspec.config.json is rejected', () => {
  const root = makeDir({ 'onpspec.config.json': JSON.stringify({ specDir: '../../..' }) });
  assert.throws(() => loadConfig(root), /specDir/);
});

test('globs can reach sibling repos but not arbitrary paths', () => {
  const outer = makeDir({ 'src/a.js': '' });
  const root = makeDir({ 'src/main.js': '' });
  const outerName = path.basename(outer);

  // multi-root: a sibling under the same parent stays allowed
  const files = walkFiles(root, {
    includeGlobs: ['src/**', `../${outerName}/src/**`],
    ignoreGlobs: [],
  });
  assert.ok(files.includes(`../${outerName}/src/a.js`));

  // absolute glob + deep escape are rejected
  assert.throws(() => walkFiles(root, { includeGlobs: ['/etc/**'], ignoreGlobs: [] }), /escapes|must|invalid/);
  assert.throws(() => walkFiles(root, { includeGlobs: ['../../../../home/**'], ignoreGlobs: [] }), /escapes|must|invalid/);
});

// ── ledger: runId / stream key traversal ──────────────────────────────────

test('caminhoStream rejects traversal in runId and chave', () => {
  assert.throws(() => caminhoStream('../x', 'k'), /invalid run id/);
  assert.throws(() => caminhoStream('run/../../x', 'k'), /invalid run id/);
  assert.throws(() => caminhoStream('run1', '../k'), /invalid stream key/);
  const p = caminhoStream('run-1', 'faixa-1--T-001');
  assert.ok(p.endsWith(`${path.sep}run-1${path.sep}faixa-1--T-001.jsonl`));
});

// ── plano: shell-safe interpolation ───────────────────────────────────────

test('renderPlanoSh slugs repo/feature/permissionMode (no shell injection)', () => {
  const plan = realPlan({ repoName: 'repo$(id);touch /tmp/x', feature: 'feat`evil`;echo hi' });
  const sh = renderPlanoSh(plan);
  assert.ok(!sh.includes('repo$('), 'no command substitution from repoName in the script');
  assert.ok(!sh.includes('feat`'), 'no backtick interpolation from feature in the script');
  assert.ok(sh.includes('acceptEdits_') && !sh.includes('$(touch /tmp/y)'), 'permissionMode is shell-safe');
  assert.ok(!/repo\$\(|feat`/.test(sh), 'no injected command syntax remains');
});

// ── CLI: containedPath boundary ───────────────────────────────────────────

test('containedPath prevents writes outside rootDir', () => {
  const root = makeDir({});
  const inside = containedPath(root, 'out.md', 'report', ['.spec', 'AUDITORIA.md']);
  assert.ok(inside.startsWith(root));
  assert.throws(() => containedPath(root, '../evil.md', 'report', ['../evil.md']), /escapes/);
  assert.throws(() => containedPath(root, '/tmp/evil.md', 'report', ['/tmp/evil.md']), /escapes/);
});