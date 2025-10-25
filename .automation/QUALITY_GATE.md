# Quality Gates

## Overview
This document defines the automated quality gates that must pass before code can be merged. All checks are automated and enforced through CI/CD pipelines.

## Quality Checks

### 1. TypeScript Compilation
**Tool**: TypeScript Compiler (tsc)  
**Command**: `npm run typecheck`  
**Requirement**: Zero compilation errors  
**Configuration**: `tsconfig.json`

**Checks**:
- Type safety
- Strict null checks
- No implicit any
- Strict function types
- Proper module resolution

**Failure Criteria**:
- Any TypeScript compilation error
- Type mismatches
- Missing type declarations

---

### 2. Linting
**Tool**: ESLint with TypeScript support  
**Command**: `npm run lint`  
**Requirement**: Zero linting errors  
**Configuration**: `eslint.config.mjs`

**Checks**:
- Code style consistency
- TypeScript best practices
- Complexity metrics:
  - Cyclomatic complexity < 10
  - Max depth < 3
  - Max lines per function < 50
  - Max parameters < 5
- Potential bugs and anti-patterns
- Async/await best practices

**Failure Criteria**:
- Any ESLint error (warnings are allowed in CI)
- Complexity thresholds exceeded
- Async/promise misuse

**Fix**: `npm run lint:fix`

---

### 3. Code Formatting
**Tool**: Prettier  
**Command**: `npm run format:check`  
**Requirement**: All files properly formatted  
**Configuration**: `.prettierrc`

**Checks**:
- Consistent indentation (2 spaces)
- Single quotes
- Semicolons
- Line width < 100 characters
- Consistent trailing commas
- LF line endings

**Failure Criteria**:
- Any file not matching Prettier format

**Fix**: `npm run format`

---

### 4. Unit Tests
**Tool**: Jest with ts-jest  
**Command**: `npm run test:coverage`  
**Requirement**: All tests pass + 90% coverage  
**Configuration**: `jest.config.js`

**Checks**:
- All tests pass
- Coverage thresholds:
  - Statements: ≥90%
  - Branches: ≥90%
  - Functions: ≥90%
  - Lines: ≥90%

**Failure Criteria**:
- Any test failure
- Coverage below 90% on any metric
- Test timeout (>10 seconds per test)

**Reports**:
- Terminal: Summary
- HTML: `coverage/index.html`
- LCOV: `coverage/lcov.info`
- JSON: `coverage/coverage-final.json`

---

### 5. Code Duplication
**Tool**: jscpd (Copy/Paste Detector)  
**Command**: `npm run duplication:check`  
**Requirement**: < 1% duplication  
**Configuration**: `.jscpd.json`

**Checks**:
- Duplicate code blocks
- Similar code patterns
- Copy-paste instances

**Thresholds**:
- **Target**: < 0.5% duplication
- **Maximum**: < 1% duplication (hard limit)

**Failure Criteria**:
- Duplication ≥ 1%

**Reports**:
- Terminal: Summary
- JSON: `reports/jscpd/jscpd-report.json`

---

### 6. Static Analysis
**Tool**: SonarQube Scanner  
**Command**: `npm run sonar`  
**Requirement**: Quality gate passes  
**Configuration**: `sonar-project.properties`

**Checks**:
- Code smells
- Security vulnerabilities
- Bugs
- Technical debt
- Maintainability rating
- Reliability rating
- Security rating

**Thresholds**:
- Maintainability: A or B rating
- Reliability: A rating
- Security: A rating
- Coverage: ≥90%
- Duplications: <1%
- Code Smells: <10 per 1000 lines

**Failure Criteria**:
- Quality gate fails
- New security vulnerabilities
- Maintainability rating < B

---

## Verification Workflow

### Local Development
```bash
# Run all checks
npm run verify

# Individual checks
npm run typecheck      # TypeScript compilation
npm run lint           # Linting
npm run format:check   # Format check
npm test              # Run tests
npm run test:coverage # With coverage
npm run duplication   # Check duplication
```

### Quick Fixes
```bash
# Fix auto-fixable issues
npm run quality:fix

# This runs:
# - npm run lint:fix (auto-fix linting issues)
# - npm run format (auto-format code)
```

### Pre-commit
Before committing code:
```bash
npm run verify
```

This ensures all quality gates pass locally before pushing.

---

## CI/CD Pipeline

### Pipeline Stages

#### Stage 1: Build & Validate
1. Install dependencies (`npm ci`)
2. TypeScript compilation check (`npm run typecheck`)
3. Linting (`npm run lint`)
4. Format check (`npm run format:check`)

#### Stage 2: Test
1. Run tests with coverage (`npm run test:ci`)
2. Upload coverage reports
3. Check coverage thresholds

#### Stage 3: Quality Analysis
1. Check code duplication (`npm run duplication:check`)
2. Run SonarQube analysis (`npm run sonar`)
3. Validate quality gates

#### Stage 4: Build
1. Clean previous builds (`npm run clean`)
2. Production build (`npm run build`)
3. Verify build artifacts

#### Stage 5: Package (on release)
1. Run full verification (`npm run verify`)
2. Package for distribution (`npm pack`)

### Pipeline Failure Conditions
Any of the following will fail the pipeline:
- TypeScript compilation errors
- Linting errors
- Formatting inconsistencies
- Test failures
- Coverage below 90%
- Duplication above 1%
- SonarQube quality gate failure
- Build errors

---

## Metrics Dashboard

### Code Quality Metrics
| Metric | Target | Maximum | Current |
|--------|--------|---------|---------|
| Test Coverage | >95% | >90% | ✓ |
| Duplication | <0.5% | <1% | ✓ |
| Complexity | <5 | <10 | ✓ |
| Lines per Function | <30 | <50 | ✓ |
| Parameters | <3 | <5 | ✓ |
| Nesting Depth | <2 | <3 | ✓ |

### Quality Ratings
| Rating | Description | Requirement |
|--------|-------------|-------------|
| A | Excellent | Target for all code |
| B | Good | Acceptable |
| C | Fair | Needs improvement |
| D | Poor | Requires refactoring |
| E | Very Poor | Not acceptable |

**Project Requirements**:
- Maintainability: A or B
- Reliability: A
- Security: A

---

## Quality Reports

### Generated Reports

#### Test Coverage
- Location: `coverage/`
- Format: HTML, LCOV, JSON
- View: Open `coverage/index.html` in browser

#### Code Duplication
- Location: `reports/jscpd/`
- Format: JSON, Console
- View: Check console output or `reports/jscpd/jscpd-report.json`

#### Linting
- Location: Terminal output
- Format: Stylish (terminal)
- Cache: `.eslintcache`

#### SonarQube
- Location: SonarQube server
- Format: Web dashboard
- Access: Via SonarQube URL

---

## Troubleshooting

### TypeScript Compilation Errors
```bash
# Check compilation
npm run typecheck

# Common fixes:
# - Update type definitions
# - Fix type mismatches
# - Add missing types
```

### Linting Errors
```bash
# Auto-fix what can be fixed
npm run lint:fix

# Manual fixes needed for:
# - Complexity issues (refactor code)
# - Logic errors
# - Async/await issues
```

### Coverage Below Threshold
```bash
# Run tests with coverage
npm run test:coverage

# View detailed report
open coverage/index.html

# Fix:
# - Add missing tests
# - Test edge cases
# - Test error paths
```

### High Duplication
```bash
# Check duplication
npm run duplication

# Fix:
# - Extract common functions
# - Create utility modules
# - Use composition over duplication
```

### Complexity Too High
```bash
# ESLint will report complexity issues
npm run lint

# Fix:
# - Break down large functions
# - Extract helper functions
# - Reduce branching
# - Use early returns
# - Apply SOLID principles
```

---

## Best Practices

### Before Commit
1. Run `npm run verify`
2. Fix any issues
3. Review changes
4. Commit with clear message

### During Development
1. Write tests first (TDD)
2. Keep functions small
3. Run tests frequently
4. Check coverage regularly
5. Refactor when needed

### Code Review
1. Ensure CI passes
2. Check coverage impact
3. Review complexity metrics
4. Verify no duplication added
5. Validate test quality

### Continuous Improvement
1. Monitor quality trends
2. Refactor problematic areas
3. Update quality standards
4. Share learnings
5. Automate more checks

---

## Quality Gate Matrix

| Check | Tool | Threshold | Blocking | Auto-Fix |
|-------|------|-----------|----------|----------|
| Type Check | tsc | 0 errors | Yes | No |
| Linting | ESLint | 0 errors | Yes | Partial |
| Formatting | Prettier | All files | Yes | Yes |
| Tests | Jest | All pass | Yes | No |
| Coverage | Jest | ≥90% | Yes | No |
| Duplication | jscpd | <1% | Yes | No |
| Complexity | ESLint | <10 | Yes | No |
| Code Smells | SonarQube | <10/kloc | Yes | No |
| Security | SonarQube | 0 vulns | Yes | No |

**Blocking**: Check must pass for CI to succeed  
**Auto-Fix**: Can be automatically fixed

---

## Integration with Git Hooks

### Pre-commit Hook (Recommended)
```bash
# Install husky
npm install --save-dev husky

# Setup pre-commit hook
npx husky install
npx husky add .husky/pre-commit "npm run verify"
```

### Pre-push Hook
```bash
npx husky add .husky/pre-push "npm run test:ci"
```

---

## Exemptions and Overrides

### When to Override
- Never override quality gates without discussion
- Document why an override is needed
- Plan to fix the issue in a follow-up

### How to Override
```typescript
// ESLint disable (use sparingly)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = legacyApiCall();

// Coverage exclusion (in jest.config.js)
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/legacy/**'  // Exclude legacy code
]
```

### Review Process
All overrides must:
1. Be documented in code
2. Have a tracking ticket
3. Be reviewed by team
4. Have a removal plan

---

## Resources

### Documentation
- [Testing Standards](./TESTING_STANDARDS.md)
- [Code Quality Standards](./CODE_QUALITY_STANDARDS.md)
- [Contributing Guide](./CONTRIBUTING.md)

### Tools
- TypeScript: https://www.typescriptlang.org/
- ESLint: https://eslint.org/
- Prettier: https://prettier.io/
- Jest: https://jestjs.io/
- jscpd: https://github.com/kucherenko/jscpd
- SonarQube: https://www.sonarqube.org/

---

**Last Updated**: 2025-10-22  
**Version**: 1.0.0
