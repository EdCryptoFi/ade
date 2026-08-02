// Coverage of T-001 (feature portal-dever-casa, repo dever-casa): the engine
// needs to audit code living OUTSIDE rootDir, referenced by globs with `../`
// (e.g.: `../automacao-wpp-onp/src/**`). Without it, Q-005 has no way to be
// resolved with "single spec and single audit in this repo".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import os from 'os';
import { walkFiles } from '../src/parsers/annotations.js';
import { loadConfig } from '../src/config.js';
import { loadProject } from '../src/core/project.js';

function makeDir(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'onpspec-multiroot-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

test('walkFiles: glob with ../ sees files outside rootDir', () => {
  const outerRepo = makeDir({ 'src/thing.test.js': '// @spec:AC-001 dummy\n' });
  const rootDir = makeDir({ 'src/main.js': '// nothing\n' });
  const outerName = path.basename(outerRepo);

  const files = walkFiles(rootDir, {
    includeGlobs: ['src/**', `../${outerName}/src/**/*.test.*`],
    ignoreGlobs: ['node_modules/**'],
  });

  assert.ok(files.includes('src/main.js'));
  assert.ok(files.includes(`../${outerName}/src/thing.test.js`));
});

test('walkFiles: nonexistent external root degrades gracefully (no crash)', () => {
  const rootDir = makeDir({ 'src/main.js': '// nothing\n' });
  const files = walkFiles(rootDir, {
    includeGlobs: ['src/**', '../onp-spec-driven-repo-que-nao-existe/src/**'],
    ignoreGlobs: [],
  });
  assert.deepEqual(files, ['src/main.js']);
});

test('walkFiles: external root does not duplicate files when globs overlap', () => {
  const outerRepo = makeDir({ 'src/a.js': '', 'src/b.test.js': '' });
  const rootDir = makeDir({});
  const outerName = path.basename(outerRepo);

  const files = walkFiles(rootDir, {
    includeGlobs: [`../${outerName}/src/**`, `../${outerName}/src/**/*.test.*`],
    ignoreGlobs: [],
  });

  assert.deepEqual(files, [`../${outerName}/src/a.js`, `../${outerName}/src/b.test.js`]);
});

test('loadProject: srcFiles/testFiles/annotations cover the external root from config', () => {
  const outerRepo = makeDir({
    'src/services/thing.js': 'export const thing = 1;\n',
    'src/services/thing.test.js': "test('@spec:AC-001 sums', () => {});\n",
  });
  const outerName = path.basename(outerRepo);

  const rootDir = makeDir({
    '.spec/features/foo/spec.md': [
      '# Spec: Foo',
      '',
      '> feature: foo',
      '> status: in-implementation',
      '',
      '## Stories',
      '',
      '### US-001 — A story',
      '',
      'As someone, I want something, so that something.',
      '',
      '#### AC-001 — A criterion',
      '',
      '- **Given** something',
      '- **When** something',
      '- **Then** something',
      '',
      '## Assumptions',
      '',
      'None.',
      '',
      '## Open Questions',
      '',
      'None.',
      '',
    ].join('\n'),
  });

  const config = {
    ...loadConfig(rootDir),
    testGlobs: ['test/**', `../${outerName}/src/**/*.test.*`],
    srcGlobs: ['src/**', `../${outerName}/src/**`],
  };
  const project = loadProject(config);

  assert.ok(project.testFiles.includes(`../${outerName}/src/services/thing.test.js`));
  assert.ok(project.srcFiles.includes(`../${outerName}/src/services/thing.js`));
  assert.ok(
    !project.srcFiles.includes(`../${outerName}/src/services/thing.test.js`),
    'a test file must not count as source code (double counting)'
  );

  const tag = project.annotations.specTags.find((t) => t.acId === 'AC-001');
  assert.ok(tag, 'expected to find @spec:AC-001 in the external root test file');
  assert.equal(tag.file, `../${outerName}/src/services/thing.test.js`);
});
