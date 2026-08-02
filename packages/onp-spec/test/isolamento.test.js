// Guard-rail: running `npm test` must not dirty the machine of whoever cloned
// the repo. The ledger is global by nature (~/.onp-spec), so every test that
// invokes the CLI needs to point ONP_SPEC_HOME at a temporary folder.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { existsSync, statSync, readdirSync, readFileSync, mkdtempSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(__dirname, '..', 'bin', 'onp-spec.js');
const HOME_REAL = path.join(os.homedir(), '.onp-spec');

function fotografar(dir) {
  if (!existsSync(dir)) return null;
  const arquivos = [];
  const andar = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) andar(full);
      else arquivos.push(`${path.relative(dir, full)}:${statSync(full).size}`);
    }
  };
  andar(dir);
  return arquivos.sort().join('|');
}

test('ONP_SPEC_HOME redirects the ledger and leaves the real home untouched', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'onpspec-iso-'));
  try {
    const antes = fotografar(HOME_REAL);
    const r = spawnSync('node', [BIN, 'evento', '--run', 'teste-isolamento', '--tipo', 'inicio'], {
      encoding: 'utf-8',
      env: { ...process.env, ONP_SPEC_HOME: tmp },
    });
    assert.equal(r.status, 0, r.stderr);
    const ledger = path.join(tmp, 'painel', 'ledger.jsonl');
    assert.ok(existsSync(ledger), 'ledger was written to ONP_SPEC_HOME');
    assert.match(readFileSync(ledger, 'utf-8'), /teste-isolamento/);
    assert.equal(fotografar(HOME_REAL), antes, 'the user ~/.onp-spec was not touched');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('no test run leaked into the user ledger', () => {
  const ledger = path.join(HOME_REAL, 'painel', 'ledger.jsonl');
  if (!existsSync(ledger)) return; // clean machine: nothing to check
  const vazados = readFileSync(ledger, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return {};
      }
    })
    .filter(
      (e) =>
        // repo at the root of the mkdtemp: the prefix shows up in the project name;
        // repo in a subfolder (<tmp>/projeto, the reexec test case): the prefix
        // only shows up in the PATH — without looking at projetoDir, a leak from
        // the reexec tests would go unnoticed
        /^onpspec-(agents|reexec|iso|painel|ledger|ui|e2e)-/.test(e.projeto || '') ||
        /onpspec-(agents|reexec|iso|painel|ledger|ui|e2e)-/.test(e.projetoDir || '')
    )
    .map((e) => e.runId);
  assert.deepEqual(
    vazados,
    [],
    `test runs in the user ledger — some test forgot ONP_SPEC_HOME:\n${vazados.join('\n')}`
  );
});
