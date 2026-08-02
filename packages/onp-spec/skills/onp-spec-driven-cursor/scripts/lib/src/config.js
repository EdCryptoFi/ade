// Project configuration — onpspec.config.json at the root (optional).
// Everything has a sensible default: `npx onp-spec audit` works with no config.

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { LICOES_DEFAULTS } from './core/licoes.js';

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
  };
}
