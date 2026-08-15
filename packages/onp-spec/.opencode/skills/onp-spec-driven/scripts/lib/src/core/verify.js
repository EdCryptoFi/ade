// verify — runs the project test command, extracts the result PER TEST
// and cross-references the feature's ACs via @spec:AC-xxx tags in test titles.
// Writes .spec/verification/<feature>.json — the "proof" the audit consumes.
//
// Neither the agent (nor the dev) decides whether an AC passed. The test runner decides.

import { execSync, spawnSync } from 'child_process';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { allAcs } from '../parsers/spec.js';

const RE_SPEC_TAG = /@spec:(AC-\d{3,})/g;
const RE_PRINCIPLE_TAG = /@principle:(P-\d{3,})/g;

// ---------- output parsers ----------

// TAP (node:test, tape, etc.): "ok 1 - title" / "not ok 2 - title".
// "# SKIP"/"# TODO" directives come through as "ok" in TAP but are NOT proof:
// a skipped test cannot prove an AC (otherwise skip = gate bypass).
export function parseTap(output) {
  const tests = [];
  for (const line of output.split(/\r?\n/)) {
    const m = line.match(/^\s*(not )?ok\s+\d+\s*(?:-\s*)?(.*)$/);
    if (!m) continue;
    let title = m[2].trim();
    let skip = false;
    const directive = title.match(/^(.*?)\s+#\s*(SKIP|TODO)\b.*$/i);
    if (directive) {
      title = directive[1].trim();
      skip = true;
    }
    // ignore node:test suite summary lines (they duplicate subtests)
    if (/^tests \d+$/.test(title)) continue;
    tests.push({ title, pass: !m[1] && !skip, skip });
  }
  return tests;
}

// "spec" format (node:test default reporter since v23/v25): "✔ title" /
// "✖ title (ms)". Fallback when the testCommand doesn't force --test-reporter=tap.
export function parseSpecFormat(output) {
  const tests = [];
  for (const line of output.split(/\r?\n/)) {
    const m = line.match(/^(\u2714|\u2716)\s+(.+?)(?:\s+\(\d+(?:\.\d+)?ms\))?$/u);
    if (!m) continue;
    tests.push({ title: m[2].trim(), pass: m[1] === '\u2714', skip: false });
  }
  return tests;
}

// vitest --reporter=json / jest --json (same assertionResults shape).
// "skipped"/"pending"/"todo"/"disabled" are not proof.
export function parseJsonReport(jsonText) {
  const data = JSON.parse(jsonText);
  const tests = [];
  for (const suite of data.testResults || []) {
    for (const t of suite.assertionResults || []) {
      tests.push({
        title: [t.fullName, t.title].filter(Boolean).join(' '),
        pass: t.status === 'passed',
        skip: t.status !== 'passed' && t.status !== 'failed',
      });
    }
  }
  return tests;
}

export function extractTags(title) {
  const acs = [...title.matchAll(RE_SPEC_TAG)].map((m) => m[1]);
  const principles = [...title.matchAll(RE_PRINCIPLE_TAG)].map((m) => m[1]);
  return { acs, principles };
}

// Reduces the test list to one verdict per tag.
// Rule: fail beats pass, pass beats skip. An AC only proven by skipped
// tests stays "skip" — which NEVER counts as proof.
const STATUS_RANK = { fail: 3, pass: 2, skip: 1 };

export function resultsByTag(tests) {
  const acResults = {}; // AC-xxx -> {status, testName}
  const principleResults = {};

  const merge = (map, id, t) => {
    const status = t.skip ? 'skip' : t.pass ? 'pass' : 'fail';
    const prev = map[id];
    if (!prev || STATUS_RANK[status] > STATUS_RANK[prev.status]) {
      map[id] = { status, testName: t.title };
    }
  };

  for (const t of tests) {
    const { acs, principles } = extractTags(t.title);
    for (const acId of acs) merge(acResults, acId, t);
    for (const pId of principles) merge(principleResults, pId, t);
  }

  return { acResults, principleResults };
}

export function gitRev(rootDir) {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

// ---------- execution ----------

export function runVerify(project, featureName) {
  const { config } = project;
  const feature = project.features.find((f) => f.name === featureName);
  if (!feature) {
    throw new Error(
      `feature "${featureName}" not found in ${config.specDir}/features/`
    );
  }
  if (!feature.spec) {
    throw new Error(`feature "${featureName}" has no spec.md`);
  }
  if (!config.testCommand) {
    throw new Error(
      'set "testCommand" in onpspec.config.json (e.g. "node --test --test-reporter=tap" or "npx vitest run --reporter=json --outputFile=.spec/verification/raw.json")'
    );
  }

  // Clean environment: if verify runs inside another test runner (CI, or the
  // lib's own tests), variables like NODE_TEST_CONTEXT/NODE_OPTIONS would make
  // the child `node --test` switch its output protocol and stop emitting TAP.
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  delete childEnv.NODE_OPTIONS;

  const proc = spawnSync(config.testCommand, {
    cwd: config.rootDir,
    shell: true,
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
    env: childEnv,
  });
  const output = `${proc.stdout || ''}\n${proc.stderr || ''}`;

  let tests = [];
  if (config.reporter === 'tap') {
    tests = parseTap(output);
    // node:test since ~v23 switched its default reporter to "spec" (✔/✖) —
    // if the testCommand is just "node --test" without --test-reporter=tap, TAP
    // won't come. Fall back to spec instead of reading 0 tests.
    if (tests.length === 0) tests = parseSpecFormat(output);
  } else if (config.reporter === 'vitest-json' || config.reporter === 'jest-json') {
    let jsonText = null;
    if (config.reporterOutputFile) {
      const p = path.join(config.rootDir, config.reporterOutputFile);
      if (existsSync(p)) jsonText = readFileSync(p, 'utf-8');
    }
    if (jsonText === null) {
      // try to find the JSON in stdout (jest --json writes to stdout)
      const start = (proc.stdout || '').indexOf('{');
      if (start >= 0) jsonText = (proc.stdout || '').slice(start);
    }
    if (jsonText === null) {
      throw new Error(
        `reporter ${config.reporter}: could not find JSON — set "reporterOutputFile" or ensure JSON on stdout`
      );
    }
    tests = parseJsonReport(jsonText);
  } else if (config.reporter === 'exitcode') {
    tests = []; // no per-test granularity
  } else {
    throw new Error(`unknown reporter: ${config.reporter}`);
  }

  const { acResults, principleResults } = resultsByTag(tests);

  // ACs with an annotated test (@spec tag in a test file) — the exitcode
  // reporter only grants proof to those; without this, exit 0 would prove
  // even an AC with no test at all.
  const testFileSet = new Set(project.testFiles);
  const annotatedAcs = new Set(
    project.annotations.specTags.filter((t) => testFileSet.has(t.file)).map((t) => t.acId)
  );

  const results = {};
  const featureAcs = allAcs(feature.spec);
  for (const ac of featureAcs) {
    if (acResults[ac.id]) {
      results[ac.id] = { ...acResults[ac.id], method: config.reporter };
    } else if (config.reporter === 'exitcode' && annotatedAcs.has(ac.id)) {
      // no per-test: only the global exit code proves (weak, but explicit)
      results[ac.id] = {
        status: proc.status === 0 ? 'pass' : 'fail',
        testName: null,
        method: 'exitcode',
      };
    }
    // no matching tag → no entry → audit flags AC_SEM_PROVA
  }

  // UX hint: tests ran but no title carries an AC tag for this feature
  const anyTagMatched = featureAcs.some((ac) => acResults[ac.id]);
  const hint =
    tests.length > 0 && !anyTagMatched && config.reporter !== 'exitcode'
      ? `no test title contains @spec:${featureAcs[0]?.id || 'AC-xxx'} — the tag goes in the TEST TITLE`
      : null;

  const record = {
    feature: featureName,
    timestamp: new Date().toISOString(),
    gitRev: gitRev(config.rootDir),
    command: config.testCommand,
    reporter: config.reporter,
    exitCode: proc.status,
    testsParsed: tests.length,
    results,
    principles: principleResults,
  };

  const outDir = path.join(project.specRoot, 'verification');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, `${featureName}.json`),
    `${JSON.stringify(record, null, 2)}\n`
  );

  return { record, rawOutput: output, hint };
}
