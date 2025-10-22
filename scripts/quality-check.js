#!/usr/bin/env node

/**
 * Quality Check Script
 * Runs all quality checks and reports results
 */

const { execSync } = require('child_process');
const chalk = require('chalk');

const checks = [
  {
    name: 'TypeScript Compilation',
    command: 'npx tsc --noEmit',
    critical: true
  },
  {
    name: 'ESLint',
    command: 'npm run lint',
    critical: true
  },
  {
    name: 'Prettier Format Check',
    command: 'npm run format:check',
    critical: true
  },
  {
    name: 'Unit Tests',
    command: 'npm run test:coverage',
    critical: true
  },
  {
    name: 'Code Duplication Check',
    command: 'npm run duplication:check',
    critical: true
  }
];

let failures = 0;
let criticalFailures = 0;

console.log(chalk.blue.bold('\n🔍 Running Quality Checks...\n'));

for (const check of checks) {
  process.stdout.write(chalk.gray(`Running ${check.name}... `));
  
  try {
    execSync(check.command, { stdio: 'pipe', encoding: 'utf-8' });
    console.log(chalk.green('✓ PASSED'));
  } catch (error) {
    failures++;
    if (check.critical) {
      criticalFailures++;
      console.log(chalk.red('✗ FAILED (Critical)'));
    } else {
      console.log(chalk.yellow('✗ FAILED (Warning)'));
    }
    
    if (error.stdout) {
      console.log(chalk.gray(error.stdout.slice(0, 500)));
    }
  }
}

console.log(chalk.blue.bold('\n' + '='.repeat(50)));

if (failures === 0) {
  console.log(chalk.green.bold('✓ All quality checks passed!'));
  process.exit(0);
} else {
  console.log(chalk.red.bold(`✗ ${failures} check(s) failed`));
  if (criticalFailures > 0) {
    console.log(chalk.red(`  ${criticalFailures} critical failure(s)`));
    process.exit(1);
  }
  process.exit(0);
}
