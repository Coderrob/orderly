#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const coverageSummaryPath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');

if (!existsSync(coverageSummaryPath)) {
  console.error(
    `Coverage summary not found at ${coverageSummaryPath}. Run "npm run test:coverage" or "npm run test:ci" first.`
  );
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [require.resolve('make-coverage-badge/cli.js'), '--output-path', '.github/badges/coverage.svg'],
  {
    stdio: 'inherit'
  }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
