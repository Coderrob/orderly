#!/usr/bin/env node

/**
 * Sets up the ripgrep (rg) binary in node_modules/.bin so it is accessible
 * in npm scripts and terminal sessions that include node_modules/.bin on PATH.
 *
 * The binary itself is provided by @vscode/ripgrep (devDependency).
 * This script only runs in development (requires devDependencies to be installed).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BIN_DIR = path.join(ROOT, 'node_modules', '.bin');

function getRgPath() {
  try {
    // @vscode/ripgrep exposes rgPath pointing to the platform binary
    const { rgPath } = require('@vscode/ripgrep');
    return rgPath;
  } catch {
    return null;
  }
}

function writeWindowsWrapper(rgPath, dest) {
  const content = `@echo off\r\n"${rgPath}" %*\r\n`;
  fs.writeFileSync(dest, content, { encoding: 'utf8' });
}

function writeUnixWrapper(rgPath, dest) {
  const content = `#!/bin/sh\nexec "${rgPath}" "$@"\n`;
  fs.writeFileSync(dest, content, { encoding: 'utf8', mode: 0o755 });
}

function main() {
  const rgPath = getRgPath();

  if (!rgPath) {
    console.warn(
      '[setup-rg] @vscode/ripgrep not found — skipping rg setup.\n' +
        '           Run "npm install" first to install devDependencies.'
    );
    process.exit(0);
  }

  if (!fs.existsSync(rgPath)) {
    console.warn(`[setup-rg] ripgrep binary not found at: ${rgPath}`);
    process.exit(0);
  }

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  // Windows: create .cmd wrapper
  const cmdDest = path.join(BIN_DIR, 'rg.cmd');
  writeWindowsWrapper(rgPath, cmdDest);

  // Unix / Git-Bash: create shell wrapper
  const shDest = path.join(BIN_DIR, 'rg');
  writeUnixWrapper(rgPath, shDest);

  // PowerShell: create .ps1 wrapper (Windows PowerShell terminals)
  const ps1Dest = path.join(BIN_DIR, 'rg.ps1');
  const ps1Content = `#!/usr/bin/env pwsh\r\n& "${rgPath}" @args\r\n`;
  fs.writeFileSync(ps1Dest, ps1Content, { encoding: 'utf8' });

  console.log(`[setup-rg] ripgrep wrappers created in node_modules/.bin/`);
  console.log(`           binary : ${rgPath}`);
  console.log(`           .cmd   : ${cmdDest}`);
  console.log(`           sh     : ${shDest}`);
  console.log(`           .ps1   : ${ps1Dest}`);
}

main();
