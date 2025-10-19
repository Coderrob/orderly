# Orderly

A configurable CLI tool that scans folders, categorizes and organizes files by type and context, enforces naming conventions (e.g., lowercase kebab case), moves and renames files, generates a manifest, and logs all actions for full auditability—ensuring a clean, consistent, and traceable directory structure.

## Features

- 🔍 **Smart File Scanning**: Automatically scans directories and categorizes files by type
- 📁 **File Organization**: Moves files into organized folders based on their type
- ✏️ **Naming Convention Enforcement**: Automatically renames files to follow consistent naming patterns (kebab-case, snake_case, camelCase, or PascalCase)
- 📋 **Manifest Generation**: Creates detailed JSON and Markdown manifests of all operations
- 📝 **Comprehensive Logging**: Full audit trail of all actions with configurable log levels
- 🎯 **Configurable Rules**: Customize file categories, patterns, and organization rules
- 🔒 **Dry Run Mode**: Preview changes before applying them
- 🎨 **Colorized Output**: Easy-to-read console output with colors

## Installation

```bash
npm install -g orderly
```

Or use directly with npx:

```bash
npx orderly organize
```

## Quick Start

1. **Initialize a configuration file**:
   ```bash
   orderly init
   ```

2. **Scan a directory** to see what would be organized:
   ```bash
   orderly scan ./my-folder
   ```

3. **Organize files** (dry run first):
   ```bash
   orderly organize ./my-folder --dry-run
   ```

4. **Apply the organization**:
   ```bash
   orderly organize ./my-folder
   ```

## Commands

### `orderly organize [directory]`

Organize files in the specified directory (defaults to current directory).

**Options:**
- `-c, --config <path>` - Path to config file
- `-d, --dry-run` - Preview changes without applying them
- `--no-manifest` - Skip manifest generation
- `-l, --log-level <level>` - Set log level (debug, info, warn, error)
- `-o, --output <path>` - Output directory for organized files

**Examples:**
```bash
# Organize current directory with dry run
orderly organize --dry-run

# Organize specific directory with custom config
orderly organize ./downloads -c ./my-config.yml

# Organize and output to a different location
orderly organize ./messy-folder -o ./organized-folder
```

### `orderly scan [directory]`

Scan a directory and display what would be organized without making changes.

**Options:**
- `-c, --config <path>` - Path to config file
- `-l, --log-level <level>` - Set log level

**Example:**
```bash
orderly scan ./downloads
```

### `orderly init`

Initialize a new configuration file.

**Options:**
- `-f, --format <format>` - Config file format (json or yaml, default: yaml)

**Example:**
```bash
orderly init --format json
```

## Configuration

Create a `.orderly.yml` (or `.orderly.yaml` or `orderly.config.json`) file in your project root:

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
  type: kebab-case  # Options: kebab-case, snake_case, camelCase, PascalCase
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
- Success/failure counts
- Detailed list of all file operations
- Any errors encountered

### Log Files

All operations are logged to `.orderly/orderly.log` for full auditability.

## Examples

### Example 1: Organize Downloads Folder

```bash
# Preview what would happen
orderly scan ~/Downloads

# Apply organization
orderly organize ~/Downloads
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
orderly organize ./media-files
```

### Example 3: Organize with Custom Output Directory

```bash
orderly organize ./source-folder -o ./organized-output
```

## Development

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
npm run dev -- organize ./test-folder
```

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
