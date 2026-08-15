// Project configuration — onpspec.config.json at the root (optional).
// Everything has a sensible default: `npx onp-spec audit` works with no config.

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { LICOES_DEFAULTS } from './core/licoes.js';

// 🔒 SECURITY: config values that build filesystem paths must stay inside the
// project. We harden the two trust boundaries that flow into `path.join`
// from `onpspec.config.json`:
//   - specDir must be a relative, non-absolute sub path with no `..` segment
//     (prevents spec reads/writes escaping rootDir);
//   - testGlobs / srcGlobs / ignoreGlobs / glob of the constitution must stay
//     in the project (prevents arbitrary file READ via `path.resolve`).
export function normalizeSpecDir(specDirRaw, rootDir) {
  let specDir = String(specDirRaw == null ? '.spec' : specDirRaw);
  if (path.isAbsolute(specDir)) {
    throw new Error(
      `"specDir" must be relative inside the project (got absolute "${specDir}")`
    );
  }
  const segs = specDir.split(/[\\/]+/).filter(Boolean);
  if (segs.some((s) => s === '..')) {
    throw new Error(
      `"specDir" cannot contain ".." (got "${specDir}") — spec files must live inside the project`
    );
  }
  const resolved = path.normalize(specDir).replace(/^\.\.(\/|$)/, '');
  const contained = path.join(rootDir, resolved);
  if (!contained.startsWith(`${path.resolve(rootDir)}${path.sep}`)) {
    throw new Error(`"specDir" must resolve inside the project (got "${specDir}")`);
  }
  return resolved;
}

// 🔒 SECURITY: keep a single glob from the untrusted config inside the project
// (or a sibling repo under the project's parent — the documented multi-root
// feature audits adjacent repos). Absolute globs and escapes beyond the parent
// are rejected: scanning arbitrary filesystem locations is never required.
export function projectGlob(g, rootDir) {
  const rootAbs = path.resolve(rootDir);
  const parentAbs = path.dirname(rootAbs);
  const globAbs = path.resolve(rootAbs, String(g));
  if (globAbs === rootAbs || globAbs.startsWith(`${rootAbs}${path.sep}`) || globAbs.startsWith(`${parentAbs}${path.sep}`)) {
    return String(g);
  }
  throw new Error(
    `glob "${g}" escapes the project and its sibling repos — only ".." one level (adjacent repos) is allowed`
  );
}

export const DEFAULT_CONFIG = {
  specDir: '.spec',
  // where to look for @spec/@principle tags
  testGlobs: ['test/**', 'tests/**', 'src/**/*.test.*', 'src/**/*.spec.*', '__tests__/**'],
  // implementation files that must be mapped into some task
  srcGlobs: ['src/**'],
  ignoreGlobs: ['node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**', '.spec/**'],
  // command that runs the tests; used by `onp-spec verify`
  testCommand: null,
  // how to interpret the output: tap | vitest-json | jest-json | exitcode
  reporter: 'tap',
  // output file for json reporters (vitest-json/jest-json)
  reporterOutputFile: null,
  // lessons layer: promotion/quarantine thresholds, window and ceilings
  licoes: { ...LICOES_DEFAULTS },
  // execution plan (onp-spec plano): parallelism and executor defaults
  paralelo: {
    // maximum number of tracks running at the same time in a wave
    maxParalelas: 3,
    // default model per task (tasks.md can override with `- Model:`; also
    // claude-sonnet-5 is a valid slug in Cursor — under codex it becomes
    // gpt-5.6-terra, which belongs to its family)
    model: 'claude-sonnet-5',
    // default effort: low|medium|high|xhigh|max (baixo|medio|alto|xalto|max accepted)
    esforco: 'medium',
    // permission mode for claude headless; to run 100% without prompts the
    // user can switch to bypassPermissions (their explicit decision)
    permissionMode: 'acceptEdits',
    // override of the --allowedTools list (null = derived from testCommand + git)
    allowedTools: null,
    // codex headless sandbox (`codex exec --sandbox`); to allow network and
    // out-of-workspace paths the user can switch to danger-full-access
    // (their explicit decision)
    sandbox: 'workspace-write',
    // model that writes the "general progress summary" every minute
    // (claude default; under codex the plan uses gpt-5.6-luna while this value
    // stays a claude-* model; under cursor it becomes composer while this value
    // is the default — claude-haiku-4-5 is not a Cursor slug)
    resumoModel: 'claude-haiku-4-5',
  },
};

export function loadConfig(rootDir) {
  const configPath = path.join(rootDir, 'onpspec.config.json');
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG, rootDir, configPath: null };
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (err) {
    throw new Error(`invalid onpspec.config.json: ${err.message}`);
  }
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    licoes: { ...DEFAULT_CONFIG.licoes, ...(raw.licoes || {}) },
    paralelo: { ...DEFAULT_CONFIG.paralelo, ...(raw.paralelo || {}) },
    rootDir,
    configPath,
    // 🔒 SECURITY: re-derive the hardening-aware values instead of trusting
    // raw spread (speeding through `...raw` earlier is fine — the caller
    // reaches for the normalized forms below for anything path-like).
    specDir: normalizeSpecDir(raw.specDir == null ? DEFAULT_CONFIG.specDir : raw.specDir, rootDir),
    testGlobs: sanitizeGlobs(raw.testGlobs == null ? DEFAULT_CONFIG.testGlobs : raw.testGlobs, rootDir),
    srcGlobs: sanitizeGlobs(raw.srcGlobs == null ? DEFAULT_CONFIG.srcGlobs : raw.srcGlobs, rootDir),
    ignoreGlobs: sanitizeGlobs(raw.ignoreGlobs == null ? DEFAULT_CONFIG.ignoreGlobs : raw.ignoreGlobs, rootDir),
  };
}

function sanitizeGlobs(globs, rootDir) {
  if (!Array.isArray(globs)) return DEFAULT_CONFIG.testGlobs;
  return globs.map((g) => projectGlob(g, rootDir));
}
