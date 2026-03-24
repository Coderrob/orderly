#!/usr/bin/env node

/**
 * Thin wrapper around the @vscode/ripgrep binary.
 * Forwards all CLI arguments transparently.
 *
 * Usage (via npm):
 *   npm run rg -- --files src
 *   npm run rg -- -n "pattern" src
 */

'use strict';

const { spawnSync } = require('child_process');

function getRgPath() {
  try {
    const { rgPath } = require('@vscode/ripgrep');
    return rgPath;
  } catch {
    return null;
  }
}

const rgPath = getRgPath();

if (!rgPath) {
  console.error('[rg] @vscode/ripgrep not found. Run "npm install" to install devDependencies.');
  process.exit(1);
}

// process.argv = ['node', 'scripts/rg.js', ...userArgs]
const args = process.argv.slice(2);

const result = spawnSync(rgPath, args, { stdio: 'inherit', shell: false });

process.exit(result.status ?? 0);
