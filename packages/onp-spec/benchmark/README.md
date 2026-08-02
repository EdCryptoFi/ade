# Benchmark — onp-spec-driven vs. competitors

Measures the **mechanical detection rate of real defects** of each spec-driven
development tool: starting from real specs from the ONP domain (class
enrollment, student grades), it seeds defects that really sicken SDD projects
and counts how many each tool detects **on its own, in a CI, with no human or
LLM in the loop**.

## How to run

```bash
# 1. prepares the competitor with a real validator (OpenSpec: clone + build)
bash benchmark/setup.sh

# 2. runs the live comparison
node benchmark/run.js
```

Without the setup the benchmark still runs: onp-spec-driven is evaluated live
and OpenSpec shows as "not available" (—). To point at an OpenSpec already
built elsewhere: `OPENSPEC_BIN=/path/to/bin/openspec.js node benchmark/run.js`.

## What is measured (and what is not)

- **Mechanical detection**: the tool emits a deterministic error for the
  defect, in a command that runs in CI. That is what keeps the spec true.
- We do **not** measure template quality, onboarding DX, or what an LLM agent
  *could* catch if it obeyed — because that is not a guarantee, it is hope.

## Tools

| Tool | How it enters | Why |
|---|---|---|
| onp-spec-driven | run live (`onp-spec audit --ci`) | it is ours |
| OpenSpec | run live (`openspec validate --strict`) | it has a real mechanical validator |
| spec-kit | capability matrix | CLI is scaffolding only; no defect validator |

The classification of spec-kit as "no mechanical validator" is justified and
verifiable in the source — see [adapters/capability.js](adapters/capability.js).

## Current result

See [RESULTS.md](RESULTS.md) (regenerated on every `node benchmark/run.js`).

Summary: **onp-spec-driven 100% (9/9)** with a clean baseline · OpenSpec 11%
(1/9, only the incomplete requirement) · spec-kit 0% mechanical.
