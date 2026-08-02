// Parser for constituicao.md — P-xxx principles with obligation level
// and executable checks.
//
//   # Constitution — v1.0.0
//   ## P-001 [MUST] Principle title
//   Free principle text.
//   - verification(test): @principle:P-001
//   - verification(forbidden): `regex` in `src/**/*.js`
//   - verification(required): `regex` in `src/**/*.js`

import { splitLines } from '../util/text.js';

const RE_VERSION = /v(\d+\.\d+\.\d+)/;
const RE_PRINCIPLE = /^##\s+(P-\d{3,})\s+\[(MUST|SHOULD|MAY)\]\s*[—–-]?\s*(.+?)\s*$/;
// principle heading with ANYTHING in brackets — to report an invalid level
// instead of silently ignoring the principle
const RE_PRINCIPLE_ANY = /^##\s+(P-\d{3,})\s+\[([^\]]+)\]\s*[—–-]?\s*(.+?)\s*$/;
const RE_CHECK = /^\s*[-*]\s*verification\((test|forbidden|required|gate)\)\s*:\s*(.+?)\s*$/i;
const RE_PATTERN_GLOB = /^`(.+?)`\s+in\s+`(.+?)`$/;

export const OBLIGATION_LEVELS = ['MUST', 'SHOULD', 'MAY'];

export function parseConstitution(content, { file = 'constituicao.md' } = {}) {
  const lines = splitLines(content);
  const result = { file, version: null, principles: [], parseIssues: [] };
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (result.version === null && line.startsWith('#') && !line.startsWith('##')) {
      const v = line.match(RE_VERSION);
      if (v) result.version = v[1];
      continue;
    }

    const principle = line.match(RE_PRINCIPLE);
    if (principle) {
      current = {
        id: principle[1],
        level: principle[2],
        title: principle[3],
        line: lineNo,
        body: [],
        checks: [],
      };
      result.principles.push(current);
      continue;
    }

    const badLevel = line.match(RE_PRINCIPLE_ANY);
    if (badLevel) {
      result.parseIssues.push({
        code: 'NIVEL_INVALIDO',
        line: lineNo,
        message: `${badLevel[1]}: level "[${badLevel[2]}]" is not one of: ${OBLIGATION_LEVELS.join(', ')} — principle would be ignored`,
      });
      // still registers the principle (as MUST, the most conservative) so
      // that its checks don't disappear
      current = {
        id: badLevel[1],
        level: 'MUST',
        title: badLevel[3],
        line: lineNo,
        body: [],
        checks: [],
      };
      result.principles.push(current);
      continue;
    }

    if (!current) continue;

    const check = line.match(RE_CHECK);
    if (check) {
      // internal kind values: 'test' | 'forbidden' | 'required' | 'gate'
      // (audit.js/scaffold.js must compare against these English values)
      const kind = check[1].toLowerCase();
      const value = check[2];

      if (kind === 'test') {
        const tag = value.match(/@principle:(P-\d{3,})/);
        current.checks.push({
          kind: 'test',
          principleTag: tag ? tag[1] : current.id,
          line: lineNo,
        });
      } else if (kind === 'gate') {
        // satisfied by the audit mechanism itself (AC_SEM_TESTE/AC_SEM_PROVA
        // etc.) — used by "meta" principles such as P-001 of the base preset
        current.checks.push({ kind: 'gate', line: lineNo });
      } else {
        const pg = value.match(RE_PATTERN_GLOB);
        if (pg) {
          current.checks.push({ kind, pattern: pg[1], glob: pg[2], line: lineNo });
        } else {
          result.parseIssues.push({
            code: 'VERIFICACAO_MALFORMADA',
            line: lineNo,
            message: `${current.id}: verification(${kind}) needs the format \`regex\` in \`glob\``,
          });
        }
      }
      continue;
    }

    if (line.trim() && !line.startsWith('#')) current.body.push(line.trim());
  }

  return result;
}
