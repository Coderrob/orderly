<p align="center">
  <img src="./public/img/orderly-logo.png" alt="Orderly logo" width="240" />
</p>

# Orderly

A configurable CLI tool that scans folders, categorizes and organizes files by type and context, enforces naming conventions, detects duplicates, removes empty folders, generates manifests, and logs all actions for auditability.

## What Orderly Is For

Orderly is for directories that accumulate mixed, inconsistently named files over time: downloads folders, shared media drops, photo exports, project handoff folders, and similar working directories. It is designed to help you move from "messy but active" to "organized and repeatable" without having to write ad hoc scripts for each cleanup pass.

At a product level, Orderly is not just a "move files by extension" utility. It combines scanning, categorization, naming normalization, duplicate review, cleanup, manifests, and logs into one workflow so you can preview changes, apply them, and audit what happened afterward.

## How Orderly Works

The main user flow is:

1. Create or discover a config that defines categories, naming rules, exclusions, and dedupe behavior.
2. Run `files scan` to inspect what Orderly sees before changing anything.
3. Run `files organize --dry-run` to preview planned file moves and optional cleanup.
4. Run `files organize` to apply the plan.
5. Use generated manifests and logs to review or revert work when needed.

Orderly also supports adjacent workflows:

- `files dedupe` for duplicate review and reporting without running organization
- `files clean` for removing empty folders only
- `files watch` for repeated polling-based organization on active directories
- `config validate` for checking that the resolved configuration is usable before execution

## Safety Model

Orderly is built to make destructive workflows explicit rather than implicit.

- Dry-run mode is available on destructive or behavior-changing commands so you can inspect intent first.
- Dedupe replacement is guarded: non-dry-run replace flows require `--confirm-replace` or `--quarantine-dir`.
- Auto-generated manifests provide an operation record for later review.
- Logs are written to `.orderly/orderly.log` so command activity is inspectable after execution.
- Revert support is available for manifest-recorded move operations.

## Typical Use Cases

- Keep `~/Downloads` organized with a starter template and repeatable cleanup.
- Sort a shared media folder into images, videos, and documents with naming normalization.
- Review duplicates in a photo or archive directory before replacing or quarantining files.
- Run organization repeatedly on an intake folder with `files watch`.

## Features

- Smart file scanning with `table`, `json`, and `csv` output
- File organization with category rules and naming conventions
- Duplicate detection with standalone reports and safer replacement workflows
- Empty-directory cleanup and post-organize cleanup support
- Manifest generation with JSON and Markdown outputs
- Manifest-based revert support for move operations
- Config validation and starter config templates
- Polling watch mode for repeated organization passes
- Dry-run support across destructive workflows
- Strict TypeScript, tests, linting, and quality gates

## Installation

```bash
npm install -g @coderrob/orderly
```

Or use directly with `npx`:

```bash
npx @coderrob/orderly files organize
```

## Quick Start

1. Initialize a configuration file:

```bash
orderly config init --template downloads
```

2. Validate the resolved configuration:

```bash
orderly config validate --directory ./my-folder
```

3. Scan a directory to preview the plan:

```bash
orderly files scan ./my-folder --format table
```

4. Preview organization and cleanup:

```bash
orderly files organize ./my-folder --dry-run --clean-empty-dirs
```

5. Review duplicates before changing files:

```bash
orderly files dedupe ./my-folder --preset safe --report-markdown ./.orderly/dedupe-report.md
```

6. Apply organization:

```bash
orderly files organize ./my-folder --clean-empty-dirs
```

## Commands

Canonical grouped commands:

```bash
orderly config init
orderly config validate
orderly files scan [directory]
orderly files organize [directory]
orderly files dedupe [directory]
orderly files clean [directory]
orderly files revert --manifest <path>
orderly files watch [directory]
```

### `orderly config init`

Initialize a new configuration file.

Options:

- `-f, --format <format>`: Config file format (`json`, `yaml`, or `yml`, default: `yaml`)
- `-t, --template <template>`: Starter template (`downloads`, `media-library`, `developer-workspace`, or `photos-only`)

Examples:

```bash
orderly config init
orderly config init --format json --template developer-workspace
```

### `orderly config validate`

Validate an existing configuration file or an auto-discovered config.

Options:

- `-c, --config <path>`: Path to config file
- `-d, --directory <path>`: Directory to search for an auto-discovered config

Examples:

```bash
orderly config validate --config ./orderly.config.json
orderly config validate --directory ./downloads
```

### `orderly files scan [directory]`

Scan a directory and display what would be organized without making changes. The directory defaults to the current working directory.

Options:

- `-c, --config <path>`: Path to config file
- `-l, --log-level <level>`: Set log level
- `--format <format>`: Output format (`table`, `json`, or `csv`)
- `--no-auto-config`: Disable auto-discovery of config files in the target directory

Examples:

```bash
orderly files scan ./downloads
orderly files scan ./downloads --format json
```

### `orderly files organize [directory]`

Organize files in the specified directory. The directory defaults to the current working directory.

Options:

- `-c, --config <path>`: Path to config file
- `-d, --dry-run`: Preview changes without applying them
- `--no-manifest`: Skip manifest generation
- `-l, --log-level <level>`: Set log level (`debug`, `info`, `warn`, `error`)
- `-o, --output <path>`: Output directory for organized files
- `--dedupe`: Enable duplicate detection before organization
- `--dedupe-action <action>`: Duplicate action (`skip`, `report`, or `replace`)
- `--clean-empty-dirs`: Remove empty directories after organization completes
- `--confirm-replace`: Explicitly confirm destructive dedupe replacement
- `--quarantine-dir <path>`: Move replaced duplicate files into a quarantine directory instead of deleting them
- `--no-auto-config`: Disable auto-discovery of config files in the target directory

Examples:

```bash
orderly files organize --dry-run
orderly files organize ./downloads -c ./my-config.yml
orderly files organize ./messy-folder -o ./organized-folder
orderly files organize ./downloads --dedupe --dedupe-action skip --clean-empty-dirs
```

If `--dedupe-action replace` is used outside dry-run mode, you must also provide `--confirm-replace` or `--quarantine-dir`.

### `orderly files dedupe [directory]`

Find duplicate files without running organization. The directory defaults to the current working directory.

Options:

- `-c, --config <path>`: Path to config file
- `-l, --log-level <level>`: Set log level
- `-d, --dry-run`: Preview actions without deleting files
- `--action <action>`: Dedupe action (`skip`, `report`, or `replace`)
- `--preset <preset>`: Strategy preset (`fast`, `safe`, `exact`, or `media`)
- `--confirm-replace`: Explicitly confirm destructive replace actions
- `--quarantine-dir <path>`: Move replaced files into a quarantine directory
- `--report-json <path>`: Write a JSON report
- `--report-markdown <path>`: Write a Markdown report
- `--no-auto-config`: Disable auto-discovery of config files in the target directory

Examples:

```bash
orderly files dedupe ./downloads
orderly files dedupe ./downloads --preset exact --report-json ./.orderly/dedupe.json
orderly files dedupe ./downloads --action replace --confirm-replace
```

If `--action replace` is used outside dry-run mode, you must also provide `--confirm-replace` or `--quarantine-dir`.

### `orderly files clean [directory]`

Remove empty folders beneath the target directory without removing the root directory itself. The directory defaults to the current working directory.

Options:

- `-c, --config <path>`: Path to config file
- `-l, --log-level <level>`: Set log level
- `--dry-run`: Preview directories that would be removed
- `--include-hidden`: Allow deleting empty hidden directories
- `--remove-orderly-dir`: Allow deleting an empty `.orderly` directory
- `--no-auto-config`: Disable auto-discovery of config files in the target directory

Examples:

```bash
orderly files clean ./downloads --dry-run
orderly files clean ./downloads --include-hidden
```

### `orderly files revert`

Revert file move operations recorded in a manifest JSON file.

Options:

- `-m, --manifest <path>`: Path to an Orderly manifest JSON file
- `-d, --dry-run`: Preview revert operations without moving files

Examples:

```bash
orderly files revert --manifest ./.orderly/manifest.json --dry-run
orderly files revert --manifest ./.orderly/manifest.json
```

### `orderly files watch [directory]`

Repeatedly organize a directory on a polling interval. The directory defaults to the current working directory.

Options:

- `-c, --config <path>`: Path to config file
- `-l, --log-level <level>`: Set log level
- `-d, --dry-run`: Preview changes without applying them
- `--no-manifest`: Skip manifest generation
- `-o, --output <path>`: Output directory for organized files
- `--dedupe`: Enable duplicate detection before organization
- `--dedupe-action <action>`: Duplicate action (`skip`, `report`, or `replace`)
- `--clean-empty-dirs`: Remove empty directories after organization completes
- `--confirm-replace`: Explicitly confirm destructive dedupe replacement
- `--quarantine-dir <path>`: Move replaced duplicate files into a quarantine directory
- `--interval <seconds>`: Polling interval in seconds (default: `5`)
- `--cycles <count>`: Number of cycles before exiting; `0` means continuous (default: `0`)
- `--no-auto-config`: Disable auto-discovery of config files in the target directory

Example:

```bash
orderly files watch ./downloads --dry-run --interval 10 --cycles 3
```

## Configuration

Create a `.orderly.yml` (or `.orderly.yaml`, `.orderly.config.yaml`, `.orderly.config.json`, or `orderly.config.json`) file in your project root. `orderly config init --template <name>` can generate one of the built-in starter templates:

- `downloads`
- `media-library`
- `developer-workspace`
- `photos-only`

Example:

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
  type: kebab-case
  lowercase: true

excludePatterns:
  - node_modules/**
  - .git/**
  - dist/**
  - build/**

includeHidden: false
dryRun: false
generateManifest: false
logLevel: info

dedupe:
  enabled: true
  recursive: false
  strategy:
    mode: any
    name:
      caseSensitive: false
      ignoreExtension: false
    size: true
    sha256: true
  action: skip
```

### Configuration Options

#### `categories`

Define file categories based on extensions and optional patterns.

- `name`: Category name
- `extensions`: List of file extensions including the dot
- `patterns`: Optional glob patterns for additional matching
- `targetFolder`: Folder name where files should be moved

#### `namingConvention`

Define how files should be renamed.

- `type`:
  - `kebab-case`
  - `snake_case`
  - `camelCase`
  - `PascalCase`
- `lowercase`: Force lowercase for kebab-case and snake_case naming

#### `excludePatterns`

Glob patterns for files and folders to exclude from scanning.

#### `includeHidden`

Whether to include hidden files.

#### `dryRun`

Preview changes without applying them.

#### `generateManifest`

Generate JSON and Markdown manifests of all operations.

For CLI `files organize` and `files watch`, manifest generation is enabled by default unless you pass `--no-manifest`.

#### `dedupe`

Control duplicate detection and duplicate handling before organization planning.

- `enabled`: Turn dedupe on or off
- `recursive`: Reserved for strategy-specific recursion behavior
- `strategy.mode`:
  - `any`: At least one applicable enabled strategy must match
  - `all`: All applicable enabled strategies must match
- `action`:
  - `skip`: Keep the primary file from each duplicate group and skip the rest
  - `report`: Report duplicate groups but keep all files in the organization pipeline
  - `replace`: Keep the primary file from each duplicate group, remove duplicate source files before planning, and continue organization with primary files only

When using replace actions from the CLI, provide either `--confirm-replace` or `--quarantine-dir` for non-dry-run execution.

#### `logLevel`

Logging verbosity: `debug`, `info`, `warn`, or `error`.

## Output

### Manifest Files

When organization completes, Orderly generates manifest files in the `.orderly` directory:

- `manifest.json`: Machine-readable JSON format
- `manifest.md`: Human-readable Markdown format

They include:

- Timestamp of operation
- Total number of operations
- Success and failure counts
- Detailed list of file operations
- Any errors encountered

### Log Files

Operations are logged to `.orderly/orderly.log`.

### Dedupe Reports

The standalone dedupe command can generate:

- JSON reports for automation
- Markdown reports with duplicate groups, matched strategies, and reclaimable bytes

## Examples

### Example 1: Organize a Downloads Folder

```bash
orderly files scan ~/Downloads --format table
orderly files organize ~/Downloads --clean-empty-dirs
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

### Example 3: Validate Config and Revert with a Manifest

```bash
orderly config validate --directory ./source-folder
orderly files revert --manifest ./.orderly/manifest.json --dry-run
```

### Example 4: Standalone Dedupe Review

```bash
orderly files dedupe ./photos --preset media --report-markdown ./.orderly/dedupe.md
```

### Example 5: Watch a Directory

```bash
orderly files watch ./downloads --dry-run --interval 10 --cycles 3
```

## Development

### Prerequisites

- Node.js >= 20.0.0
- npm >= 9.0.0

### Build from Source

```bash
git clone https://github.com/Coderrob/orderly.git
cd orderly
npm install
npm run build
npm run dev -- files organize ./test-folder --dry-run
```

When running commands through `npm run dev`, pass CLI arguments after `--` so npm forwards them to Orderly (especially flags like `-h`/`--help`).

```bash
npm run dev -- files dedupe --help
```

### Testing

```bash
npm test
npm run test:coverage
npm run test:watch
npm run test:ci
```

The main validation entrypoint is:

```bash
npm run verify
```

### Code Quality

```bash
npm run lint
npm run lint:fix
npm run format:check
npm run format
npm run typecheck
npm run duplication:check
npm run verify
```

### Documentation

- [TESTING_STANDARDS.md](./.automation/TESTING_STANDARDS.md)
- [CODE_QUALITY_STANDARDS.md](./.automation/CODE_QUALITY_STANDARDS.md)
- [QUALITY_GATE.md](./.automation/QUALITY_GATE.md)
- [AGENTS.md](./AGENTS.md)

## License

Apache-2.0
