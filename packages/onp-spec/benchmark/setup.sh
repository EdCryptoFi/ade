#!/usr/bin/env bash
# Prepares the benchmark by cloning and building OpenSpec (the competitor with a
# real mechanical validator) so the comparison runs LIVE. spec-kit enters via
# the capability matrix (verified in the source — see
# benchmark/adapters/capability.js), so it needs no build.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENDOR="$DIR/.vendor"
mkdir -p "$VENDOR"

if [ ! -d "$VENDOR/OpenSpec" ]; then
  echo "→ cloning OpenSpec..."
  git clone --depth 1 https://github.com/Fission-AI/OpenSpec.git "$VENDOR/OpenSpec"
fi

cd "$VENDOR/OpenSpec"
echo "→ installing OpenSpec dependencies..."
# --ignore-scripts: OpenSpec's postinstall calls pnpm, which may not exist;
# we only need the deps for the TypeScript build to run.
npm install --no-package-lock --ignore-scripts --silent
echo "→ building OpenSpec..."
node build.js

echo "✔ ready. run: node benchmark/run.js"
