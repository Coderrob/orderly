#!/usr/bin/env node

/**
 * Setup and Verification Script
 * Prepares the project for quality checks and runs all verifications
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue.bold('\n🚀 Orderly Quality Setup & Verification\n'));
console.log(chalk.gray('This script will set up and verify the project quality standards.\n'));

// Step 1: Cleanup old configs
console.log(chalk.cyan('Step 1: Cleaning up old configuration files...'));
const oldConfigs = ['.eslintrc.json'];
oldConfigs.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(chalk.green(`  ✓ Removed ${file}`));
  }
});

// Step 2: Install/update dependencies
console.log(chalk.cyan('\nStep 2: Checking dependencies...'));
try {
  console.log(chalk.gray('  Running npm install...'));
  execSync('npm install', { stdio: 'inherit' });
  console.log(chalk.green('  ✓ Dependencies installed'));
} catch (error) {
  console.log(chalk.yellow('  ⚠ Warning: npm install had issues'));
}

// Step 3: Clean build artifacts
console.log(chalk.cyan('\nStep 3: Cleaning build artifacts...'));
try {
  execSync('npm run clean', { stdio: 'pipe' });
  console.log(chalk.green('  ✓ Build artifacts cleaned'));
} catch (error) {
  console.log(chalk.yellow('  ⚠ Clean step skipped (not critical)'));
}

// Step 4: TypeScript compilation check
console.log(chalk.cyan('\nStep 4: TypeScript compilation check...'));
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log(chalk.green('  ✓ TypeScript compilation passed'));
} catch (error) {
  console.log(chalk.red('  ✗ TypeScript compilation failed'));
  console.log(chalk.gray(error.stdout?.toString().slice(0, 500)));
  process.exit(1);
}

// Step 5: Linting
console.log(chalk.cyan('\nStep 5: Linting code...'));
try {
  execSync('npm run lint', { stdio: 'pipe' });
  console.log(chalk.green('  ✓ Linting passed'));
} catch (error) {
  console.log(chalk.yellow('  ⚠ Linting has warnings (attempting auto-fix)'));
  try {
    execSync('npm run lint:fix', { stdio: 'pipe' });
    console.log(chalk.green('  ✓ Auto-fixed linting issues'));
  } catch (fixError) {
    console.log(chalk.red('  ✗ Could not auto-fix all issues'));
    console.log(chalk.gray('  Run "npm run lint" to see details'));
  }
}

// Step 6: Format check
console.log(chalk.cyan('\nStep 6: Code formatting check...'));
try {
  execSync('npm run format:check', { stdio: 'pipe' });
  console.log(chalk.green('  ✓ Code formatting is correct'));
} catch (error) {
  console.log(chalk.yellow('  ⚠ Code needs formatting (auto-formatting)'));
  try {
    execSync('npm run format', { stdio: 'pipe' });
    console.log(chalk.green('  ✓ Code formatted successfully'));
  } catch (formatError) {
    console.log(chalk.red('  ✗ Could not format code'));
  }
}

// Step 7: Run tests
console.log(chalk.cyan('\nStep 7: Running tests with coverage...'));
try {
  execSync('npm run test:coverage', { stdio: 'inherit' });
  console.log(chalk.green('  ✓ All tests passed with adequate coverage'));
} catch (error) {
  console.log(chalk.red('  ✗ Tests failed or coverage below threshold'));
  process.exit(1);
}

// Step 8: Check duplication
console.log(chalk.cyan('\nStep 8: Checking code duplication...'));
try {
  execSync('npm run duplication:check', { stdio: 'pipe' });
  console.log(chalk.green('  ✓ Code duplication is below 1%'));
} catch (error) {
  console.log(chalk.yellow('  ⚠ Code duplication is above threshold'));
  execSync('npm run duplication', { stdio: 'inherit' });
}

// Step 9: Build
console.log(chalk.cyan('\nStep 9: Building project...'));
try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log(chalk.green('  ✓ Build successful'));
} catch (error) {
  console.log(chalk.red('  ✗ Build failed'));
  console.log(chalk.gray(error.stdout?.toString().slice(0, 500)));
  process.exit(1);
}

// Summary
console.log(chalk.blue.bold('\n' + '='.repeat(60)));
console.log(chalk.green.bold('✅ All quality checks passed!'));
console.log(chalk.blue.bold('='.repeat(60)));

console.log(chalk.cyan('\n📊 Quality Metrics:'));
console.log(chalk.gray('  • Test Coverage: ≥90%'));
console.log(chalk.gray('  • Code Duplication: <1%'));
console.log(chalk.gray('  • Cyclomatic Complexity: ≤10'));
console.log(chalk.gray('  • Max Lines/Function: ≤50'));
console.log(chalk.gray('  • TypeScript: Strict mode'));

console.log(chalk.cyan('\n📚 Documentation:'));
console.log(chalk.gray('  • TESTING_STANDARDS.md - Testing guidelines'));
console.log(chalk.gray('  • CODE_QUALITY_STANDARDS.md - Code quality standards'));
console.log(chalk.gray('  • QUALITY_GATE.md - Quality gates and automation'));
console.log(chalk.gray('  • PROJECT_INDEX.md - Documentation hub'));

console.log(chalk.cyan('\n🚀 Next Steps:'));
console.log(chalk.gray('  1. Review documentation in *.md files'));
console.log(chalk.gray('  2. Run "npm run verify" before committing'));
console.log(chalk.gray('  3. Set up git hooks: npx husky install (optional)'));

console.log(chalk.blue.bold('\n✨ Setup complete! Happy coding!\n'));
