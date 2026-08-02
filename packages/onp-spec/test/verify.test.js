import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTap, parseJsonReport, resultsByTag, extractTags } from '../src/core/verify.js';

test('parseTap reads ok/not ok lines with titles', () => {
  const tap = `TAP version 13
ok 1 - AC-001: entrega no prazo @spec:AC-001
not ok 2 - AC-002: atrasada @spec:AC-002
ok 3 - another thing without a tag
1..3
`;
  const tests = parseTap(tap);
  assert.equal(tests.length, 3);
  assert.equal(tests[0].pass, true);
  assert.equal(tests[1].pass, false);
});

test('parseJsonReport reads the vitest/jest shape', () => {
  const json = JSON.stringify({
    testResults: [
      {
        assertionResults: [
          { fullName: 'AC-001 @spec:AC-001', title: '', status: 'passed' },
          { fullName: '', title: 'AC-002 @spec:AC-002', status: 'failed' },
        ],
      },
    ],
  });
  const tests = parseJsonReport(json);
  assert.equal(tests.length, 2);
  assert.equal(tests[0].pass, true);
  assert.equal(tests[1].pass, false);
});

test('extractTags finds @spec and @principle in the title', () => {
  const { acs, principles } = extractTags('AC-001 and AC-002 @spec:AC-001 @spec:AC-002 @principle:P-001');
  assert.deepEqual(acs, ['AC-001', 'AC-002']);
  assert.deepEqual(principles, ['P-001']);
});

test('resultsByTag: one failure brings the AC down even with another test passing', () => {
  const { acResults } = resultsByTag([
    { title: 'happy path @spec:AC-001', pass: true },
    { title: 'edge case @spec:AC-001', pass: false },
  ]);
  assert.equal(acResults['AC-001'].status, 'fail');
});

test('resultsByTag: all passing gives pass', () => {
  const { acResults, principleResults } = resultsByTag([
    { title: 'a @spec:AC-001', pass: true },
    { title: 'b @spec:AC-001 @principle:P-002', pass: true },
  ]);
  assert.equal(acResults['AC-001'].status, 'pass');
  assert.equal(principleResults['P-002'].status, 'pass');
});
