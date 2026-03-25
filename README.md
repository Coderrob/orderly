<p align="center">
  <img
    src="public/img/orderly-logo-small.png"
    alt="Orderly logo"
  />
</p>

# Orderly

A configurable CLI tool that scans folders, categorizes and organizes files by type and context, enforces naming conventions (e.g., lowercase kebab case), moves and renames files, generates a manifest, and logs all actions for full auditability—ensuring a clean, consistent, and traceable directory structure.

---

<!-- Primary Badges -->
<div align="center">

[![NPM Version](https://img.shields.io/npm/v/@coderrob/orderly?style=flat-square)](https://www.npmjs.com/package/@coderrob/orderly)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

<!-- Quality Badges -->

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg?style=flat-square)](https://github.com/Coderrob/orderly)
[![Code Quality](https://img.shields.io/badge/code%20quality-A+-brightgreen.svg?style=flat-square)](https://github.com/Coderrob/orderly)

<!-- Standards & Tools -->

[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square&logo=prettier)](https://prettier.io/)
[![Linter: ESLint](https://img.shields.io/badge/linter-ESLint-4B32C3.svg?style=flat-square&logo=eslint)](https://eslint.org/)
[![Tested with Jest](https://img.shields.io/badge/tested_with-jest-99424f.svg?style=flat-square&logo=jest)](https://jestjs.io/)
[![Commitizen Friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)](http://commitizen.github.io/cz-cli/)

<!-- Metrics -->

[![Code Duplication](https://img.shields.io/badge/duplication-%3C1%25-brightgreen.svg?style=flat-square)](https://github.com/Coderrob/orderly)
[![Maintainability](https://img.shields.io/badge/maintainability-A-brightgreen.svg?style=flat-square)](https://github.com/Coderrob/orderly)
[![Dependencies](https://img.shields.io/badge/dependencies-5-blue.svg?style=flat-square)](package.json)
[![DevDependencies](https://img.shields.io/badge/devDependencies-19-blue.svg?style=flat-square)](package.json)

<!-- Additional Badges -->

[![GitHub Stars](https://img.shields.io/github/stars/Coderrob/orderly?style=flat-square)](https://github.com/Coderrob/orderly/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/Coderrob/orderly?style=flat-square)](https://github.com/Coderrob/orderly/issues)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/Coderrob/orderly?style=flat-square)](https://github.com/Coderrob/orderly/commits/main)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

</div>

---

## Features

- 🔍 **Smart File Scanning**: Automatically scans directories and categorizes files by type
- 📁 **File Organization**: Moves files into organized folders based on their type
- ✏️ **Naming Convention Enforcement**: Automatically renames files to follow consistent naming patterns (kebab-case, snake_case, camelCase, or PascalCase)
- 📋 **Manifest Generation**: Creates detailed JSON and Markdown manifests of all operations
- 📝 **Comprehensive Logging**: Full audit trail of all actions with configurable log levels
- 🎯 **Configurable Rules**: Customize file categories, patterns, and organization rules
- 🔒 **Dry Run Mode**: Preview changes before applying them
- 🎨 **Colorized Output**: Easy-to-read console output with colors
- 🛡️ **Type Safety**: Built with TypeScript using strict mode and type-safe enums
- ✅ **Production Ready**: comprehensive test suite, strict linting, and enforced quality gates

## Installation

```bash
npm install -g orderly
```

Or use directly with npx:

```bash
npx orderly files organize
```

## Quick Start

1. **Initialize a configuration file**:

   ```bash
   orderly config init
   ```

2. **Scan a directory** to see what would be organized:

   ```bash
   orderly files scan ./my-folder
   ```

3. **Organize files** (dry run first):

   ```bash
   orderly files organize ./my-folder --dry-run
   ```

4. **Inspect duplicates** before changing files, if needed:

   ```bash
   orderly files dedupe ./my-folder
   ```

5. **Clean empty folders after organizing, if needed**:

   ```bash
   orderly files clean ./my-folder --dry-run
   ```

6. **Apply the organization**:

   ```bash
   orderly files organize ./my-folder
   ```

## Commands

Canonical grouped commands:

```bash
orderly files scan [directory]
orderly files organize [directory]
orderly files dedupe [directory]
orderly files clean [directory]
orderly config init
```

### `orderly files organize [directory]`

Organize files in the specified directory (defaults to current directory).

**Options:**

- `-c, --config <path>` - Path to config file
- `-d, --dry-run` - Preview changes without applying them
- `--no-manifest` - Skip manifest generation
- `-l, --log-level <level>` - Set log level (debug, info, warn, error)
- `-o, --output <path>` - Output directory for organized files
- `--no-auto-config` - Disable auto-discovery of config files in target directory

> **Note:** By default, Orderly will automatically use a config file if found in the target directory. It searches in this order and uses the first file it finds: `.orderly.yml`, `.orderly.yaml`, `.orderly.config.yaml`, `.orderly.config.json`, then `orderly.config.json`. Use `--no-auto-config` to disable this behavior and use only the default configuration or an explicitly specified config file.

**Examples:**

```bash
# Organize current directory with dry run
orderly files organize --dry-run

# Organize specific directory with custom config
orderly files organize ./downloads -c ./my-config.yml

# Organize and output to a different location
orderly files organize ./messy-folder -o ./organized-folder
```

### `orderly files scan [directory]`

Scan a directory and display what would be organized without making changes.

**Options:**

- `-c, --config <path>` - Path to config file
- `-l, --log-level <level>` - Set log level
- `--no-auto-config` - Disable auto-discovery of config files in target directory

> **Note:** By default, Orderly will automatically use a config file if found in the target directory. A message will be displayed when an auto-discovered config is used.

**Example:**

```bash
orderly files scan ./downloads
```

### `orderly files clean [directory]`

Remove empty folders beneath the target directory without removing the root directory itself.

**Options:**

- `--dry-run` - Preview directories that would be removed
- `--include-hidden` - Allow deleting empty hidden directories
- `--remove-orderly-dir` - Allow deleting an empty `.orderly` directory
- `-l, --log-level <level>` - Set log level
- `-c, --config <path>` - Path to config file

**Examples:**

```bash
# Preview empty folder cleanup
orderly files clean ./downloads --dry-run

# Remove empty hidden folders too
orderly files clean ./downloads --include-hidden
```

### `orderly files dedupe [directory]`

Find duplicate files without running organization.

**Options:**

- `-c, --config <path>` - Path to config file
- `-l, --log-level <level>` - Set log level
- `-d, --dry-run` - Preview replacement behavior without deleting files
- `--action <action>` - Dedupe action (`skip`, `report`, or `replace`)
- `--report-json <path>` - Write a JSON dedupe report
- `--report-markdown <path>` - Write a Markdown dedupe report
- `--no-auto-config` - Disable auto-discovery of config files in target directory

**Examples:**

```bash
# Generate default reports in .orderly/
orderly files dedupe ./downloads

# Replace duplicates after review
orderly files dedupe ./downloads --action replace
```

### `orderly config init`

Initialize a new configuration file.

**Options:**

- `-f, --format <format>` - Config file format (json or yaml, default: yaml)

**Example:**

```bash
orderly config init --format json
```

## Configuration

Create a `.orderly.yml` (or `.orderly.yaml`, `.orderly.config.yaml`, `.orderly.config.json`, or `orderly.config.json`) file in your project root:

```yaml
categories:
  - name: images
    extensions:
      - .jpg
      - .jpeg
      - .png
      - .gif
      - .svg
      - .webp
    targetFolder: images
  - name: documents
    extensions:
      - .pdf
      - .doc
      - .docx
      - .txt
      - .md
    targetFolder: documents
  - name: code
    extensions:
      - .js
      - .ts
      - .py
      - .java
    targetFolder: code

namingConvention:
  type: kebab-case # Options: kebab-case, snake_case, camelCase, PascalCase
  lowercase: true

excludePatterns:
  - node_modules/**
  - .git/**
  - dist/**
  - build/**

includeHidden: false
dryRun: false
generateManifest: true
logLevel: info

dedupe:
  enabled: true
  recursive: false
  strategy:
    mode: any # Options: any, all
    name:
      caseSensitive: false
      ignoreExtension: false
    size: true
    sha256: true
  action: skip # Options: skip, report, replace
```

### Configuration Options

#### `categories`

Define file categories based on extensions and optional patterns.

- `name`: Category name
- `extensions`: List of file extensions (including the dot)
- `patterns`: Optional glob patterns for additional matching
- `targetFolder`: Folder name where files should be moved

#### `namingConvention`

Define how files should be renamed.

- `type`: Naming convention type
  - `kebab-case`: my-file-name.txt
  - `snake_case`: my_file_name.txt
  - `camelCase`: myFileName.txt
  - `PascalCase`: MyFileName.txt
- `lowercase`: Force lowercase (only applies to kebab-case and snake_case)

#### `excludePatterns`

Glob patterns for files/folders to exclude from scanning.

#### `includeHidden`

Whether to include hidden files (starting with `.`).

#### `dryRun`

Preview changes without applying them.

#### `generateManifest`

Generate JSON and Markdown manifests of all operations.

#### `dedupe`

Control duplicate detection and duplicate handling before organization planning.

- `enabled`: Turn dedupe on or off.
- `recursive`: Reserved for strategy-specific recursion behavior.
- `strategy.mode`:
  - `any`: A file pair is treated as duplicate when at least one applicable enabled strategy matches.
  - `all`: A file pair is treated as duplicate only when all applicable enabled strategies match.
- `action`:
  - `skip`: Keep the primary file from each duplicate group and skip the rest.
  - `report`: Report duplicate groups but keep all files in the organization pipeline.
  - `replace`: Keep the primary file from each duplicate group, remove duplicate source files before planning, and continue organization with primary files only. In dry-run mode, no files are removed and planned removals are only reported.

#### `logLevel`

Logging verbosity: `debug`, `info`, `warn`, or `error`.

## Output

### Manifest Files

When organization completes, Orderly generates two manifest files in the `.orderly` directory:

1. **manifest.json**: Machine-readable JSON format
2. **manifest.md**: Human-readable Markdown format

These files contain:

- Timestamp of operation
- Total number of operations
- Success/failure/skipped counts
- Detailed list of all file operations
- Any errors encountered

### Log Files

All operations are logged to `.orderly/orderly.log` for full auditability.

## Examples

### Example 1: Organize Downloads Folder

```bash
# Preview what would happen
orderly files scan ~/Downloads

# Apply organization
orderly files organize ~/Downloads
```

### Example 2: Custom Organization

Create `.orderly.yml`:

```yaml
categories:
  - name: photos
    extensions: [.jpg, .jpeg, .png]
    targetFolder: Photos
  - name: videos
    extensions: [.mp4, .mov]
    targetFolder: Videos

namingConvention:
  type: kebab-case
  lowercase: true
```

Then run:

```bash
orderly files organize ./media-files
```

### Example 3: Organize with Custom Output Directory

```bash
orderly files organize ./source-folder -o ./organized-output
```

## Development

### Prerequisites

- Node.js ≥ 18.0.0
- npm ≥ 9.0.0

### Build from Source

```bash
# Clone the repository
git clone https://github.com/Coderrob/orderly.git
cd orderly

# Install dependencies
npm install

# Build
npm run build

# Run locally
npm run dev -- files organize ./test-folder
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode (development)
npm run test:watch

# CI/CD mode
npm run test:ci
```

**Test Results**: The test suite and coverage checks are validated through `npm run verify`.

### Code Quality

This project maintains exceptional code quality through automated checks and standards:

```bash
# Run linting
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Check code formatting
npm run format:check

# Format code
npm run format

# Type checking
npm run typecheck

# Check code duplication (< 1%)
npm run duplication

# Run static analysis
npm run sonar

# Full quality check
npm run verify

# Quick quality fixes
npm run quality:fix
```

### Quality Signals

- Automated type checking via `npm run typecheck`
- Lint enforcement via `npm run lint`
- Formatting checks via `npm run format:check`
- Coverage and test execution via `npm run test:coverage`
- Full quality gate via `npm run verify`

### Code Quality Features

- **Type-Safe Enums**: All string literals replaced with type-safe enums
  - `ConfigFormat`: JSON, YAML configuration formats
  - `NamingConventionType`: kebab-case, snake_case, camelCase, PascalCase
  - `FileOperationType`: move, rename, move-rename operations
  - `OperationStatus`: success, failed, skipped status tracking
- **Defensive Testing**: Comprehensive test assertions using `toHaveBeenCalledTimes()` and `toHaveBeenNthCalledWith()`
- **Module Consistency**: Proper Node.js module imports with `node:` prefix for built-in modules
- **Mock Integrity**: All tests use proper mocking patterns with `jest.mock()` and `jest.mocked()`

### Documentation

Comprehensive documentation is available:

- [TESTING_STANDARDS.md](./.automation/TESTING_STANDARDS.md) - Testing guidelines and best practices
- [CODE_QUALITY_STANDARDS.md](./.automation/CODE_QUALITY_STANDARDS.md) - SOLID principles and clean code
- [QUALITY_GATE.md](./.automation/QUALITY_GATE.md) - Automated quality checks and gates
- [AGENTS.md](./AGENTS.md) - AI agent expectations and standards

## Recent Improvements

### Version 1.0.0 - Type Safety & Quality Enhancements

- ✅ **Type-Safe Enums**: Replaced all string literals with TypeScript enums for compile-time safety
  - Configuration format validation (JSON/YAML)
  - Naming convention types (kebab-case, snake_case, camelCase, PascalCase)
  - File operation types (move, rename, move-rename)
  - Operation status tracking (success, failed, skipped)
- ✅ **Enhanced Test Quality**: Upgraded all unit tests with defensive assertions
  - Precise call count verification with `toHaveBeenCalledTimes()`
  - Argument validation with `toHaveBeenNthCalledWith()`
  - Proper module mocking with `node:` prefix consistency
- ✅ **Bug Fixes**: Resolved critical module import mismatches and test mocking issues
- ✅ **Quality Gates**: Full verify/build pipeline is part of the standard workflow
- ✅ **Zero Defects**: No TypeScript errors, no lint errors, no code duplication

## License

Apache-2.0
