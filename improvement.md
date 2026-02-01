# Orderly Codebase Improvement Plan

This document outlines the current state, desired improvements, and implementation guidance for enhancing the file organization and management within the Orderly repository using an **Interface-Driven Development (IDD)** approach.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Interface-Driven Development Philosophy](#interface-driven-development-philosophy)
3. [Refactoring Patterns](#refactoring-patterns)
4. [Core Interface Architecture](#core-interface-architecture)
5. [Improvement Areas](#improvement-areas)
   - [1. Consolidate Duplicate ConfigFormat Enum](#1-consolidate-duplicate-configformat-enum)
   - [2. Extract Organizer Interfaces to Dedicated Types File](#2-extract-organizer-interfaces-to-dedicated-types-file)
   - [3. Refactor CLI into Interface-Driven Modules](#3-refactor-cli-into-interface-driven-modules)
   - [4. Add Tests for Interface Implementations](#4-add-tests-for-interface-implementations)
   - [5. Create Errors Module with Error Interfaces](#5-create-errors-module-with-error-interfaces)
   - [6. Create Constants Module with Type-Safe Definitions](#6-create-constants-module-with-type-safe-definitions)
   - [7. Fix Utils Barrel Export and Add Interface Re-exports](#7-fix-utils-barrel-export-and-add-interface-re-exports)
6. [Feature: De-duplication Module](#feature-de-duplication-module)
7. [Implementation Priority Matrix](#implementation-priority-matrix)
8. [Implementation Schedule](#implementation-schedule)
9. [Rollback Plan](#rollback-plan)
10. [Appendices](#appendix-a-naming-conventions--vocabulary)
    - [A. Naming Conventions & Vocabulary](#appendix-a-naming-conventions--vocabulary)
    - [B. Dedupe Strategy Summary](#appendix-b-dedupe-strategy-summary)
    - [C. Reuse Matrix](#appendix-c-reuse-matrix)

---

## Executive Summary

The Orderly codebase demonstrates solid architectural foundations with clear separation of concerns. This improvement plan adopts an **Interface-Driven Development (IDD)** approach to enhance maintainability, enable better testability through dependency injection, and establish clear contracts between components.

**Key Metrics:**

- Current file count: ~30 source files
- Test coverage: Good (most modules have corresponding test files)
- Main pain points: Duplicate definitions, large CLI file, scattered interfaces, tight coupling

---

## Interface-Driven Development Philosophy

### What is Interface-Driven Development?

Interface-Driven Development (IDD) is an architectural approach where:

1. **Interfaces define contracts** - All component interactions are defined through interfaces first
2. **Implementation follows interface** - Concrete classes implement well-defined interfaces
3. **Dependencies are abstractions** - Components depend on interfaces, not concrete implementations
4. **Testability is built-in** - Interfaces enable easy mocking and testing

### Benefits for Orderly

| Benefit | Description |
|---------|-------------|
| **Loose Coupling** | Components interact through contracts, not implementations |
| **Testability** | Easy to mock dependencies for unit testing |
| **Extensibility** | New implementations can be added without changing consumers |
| **Documentation** | Interfaces serve as living documentation of capabilities |
| **Dependency Injection** | Enables runtime configuration of implementations |

### IDD Principles Applied

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTERFACE LAYER (Contracts)                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ IFileScanner │ │ IFileOrganizer│ │ IOperationPlanner       │ │
│  │ ILogger      │ │ IConfigLoader│ │ IOperationExecutor      │ │
│  │ IFileSystem  │ │ IManifest... │ │ ICategorizer            │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 IMPLEMENTATION LAYER (Concrete)                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ FileScanner  │ │ FileOrganizer│ │ OperationPlanner        │ │
│  │ Logger       │ │ ConfigLoader │ │ OperationExecutor       │ │
│  │ FileSystem...│ │ Manifest...  │ │ FileCategorizer         │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Refactoring Patterns

All implementations must follow Martin Fowler's refactoring patterns to ensure clean, maintainable code. These patterns are **mandatory** during implementation.

### 1. Guard Clauses (Short-Cut Returns)

Use early returns to eliminate nested conditionals and reduce cognitive complexity.

**❌ Before (Nested Conditionals):**

```typescript
function processFile(file: IScannedFile): IFileOperation | null {
  if (file) {
    if (file.requiresRename || file.targetFolder) {
      if (file.targetFolder && file.requiresRename) {
        return {
          type: FileOperationType.MOVE_RENAME,
          originalPath: file.originalPath,
          newPath: this.buildNewPath(file),
          reason: 'Move and rename'
        };
      } else if (file.targetFolder) {
        return {
          type: FileOperationType.MOVE,
          originalPath: file.originalPath,
          newPath: this.buildNewPath(file),
          reason: 'Move to category folder'
        };
      } else {
        return {
          type: FileOperationType.RENAME,
          originalPath: file.originalPath,
          newPath: this.buildNewPath(file),
          reason: 'Apply naming convention'
        };
      }
    } else {
      return null;
    }
  }
  return null;
}
```

**✅ After (Guard Clauses):**

```typescript
function processFile(file: IScannedFile): IFileOperation | null {
  if (!file) return null;
  if (!file.requiresRename && !file.targetFolder) return null;

  const type = this.determineOperationType(file);
  const reason = this.buildReason(type);

  return {
    type,
    originalPath: file.originalPath,
    newPath: this.buildNewPath(file),
    reason
  };
}

private determineOperationType(file: IScannedFile): FileOperationType {
  if (file.targetFolder && file.requiresRename) return FileOperationType.MOVE_RENAME;
  if (file.targetFolder) return FileOperationType.MOVE;
  return FileOperationType.RENAME;
}
```

**Rules for Guard Clauses:**

- [ ] Check for null/undefined first, return immediately
- [ ] Check for empty collections, return early
- [ ] Check for invalid state, throw or return early
- [ ] Main logic should be at the lowest nesting level
- [ ] Maximum nesting depth: 2 levels

### 2. Extract Method

Break down large methods into smaller, focused methods with descriptive names.

**❌ Before (Long Method):**

```typescript
async execute(options: OrganizeOptions): Promise<void> {
  // 50+ lines of mixed responsibilities
  const configPath = options.config ? path.resolve(options.config) : undefined;
  if (configPath && !fs.existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}`);
  }
  const config = configPath ? ConfigLoader.load(configPath) : ConfigLoader.load();
  if (options.dryRun !== undefined) config.dryRun = options.dryRun;
  if (options.logLevel) config.logLevel = options.logLevel as LogLevel;
  
  const targetDir = options.directory ? path.resolve(options.directory) : process.cwd();
  if (!fs.existsSync(targetDir)) {
    throw new Error(`Directory not found: ${targetDir}`);
  }
  
  const logger = new Logger(config.logLevel);
  const scanner = new FileScanner(config, logger);
  const files = await scanner.scan(targetDir);
  
  console.log(`Found ${files.length} files`);
  const summary = scanner.getCategorySummary(files);
  summary.forEach((count, category) => {
    console.log(`  ${category}: ${count}`);
  });
  
  // ... 30 more lines
}
```

**✅ After (Extracted Methods):**

```typescript
async execute(options: OrganizeOptions): Promise<void> {
  const config = this.loadConfiguration(options);
  const targetDir = this.resolveTargetDirectory(options);
  const { scanner, organizer } = this.createServices(config);

  const files = await scanner.scan(targetDir);
  this.displayFileSummary(files, scanner);

  const operations = organizer.planOperations(files);
  const result = organizer.executeOperations(operations);

  this.displayResults(result);
  this.saveManifestIfEnabled(config, result);
}

private loadConfiguration(options: OrganizeOptions): IOrderlyConfig {
  const configPath = this.resolveConfigPath(options.config);
  const config = this.configService.load(configPath);
  return this.applyOptionOverrides(config, options);
}

private resolveConfigPath(configOption?: string): string | undefined {
  if (!configOption) return undefined;

  const resolved = path.resolve(configOption);
  if (!this.fileSystem.existsSync(resolved)) {
    throw new ConfigNotFoundError(resolved);
  }
  return resolved;
}

private resolveTargetDirectory(options: OrganizeOptions): string {
  const targetDir = options.directory 
    ? path.resolve(options.directory) 
    : process.cwd();

  if (!this.fileSystem.existsSync(targetDir)) {
    throw new DirectoryNotFoundError(targetDir);
  }
  return targetDir;
}

private applyOptionOverrides(config: IOrderlyConfig, options: OrganizeOptions): IOrderlyConfig {
  return {
    ...config,
    dryRun: options.dryRun ?? config.dryRun,
    logLevel: (options.logLevel as LogLevel) ?? config.logLevel
  };
}

private createServices(config: IOrderlyConfig): { scanner: IFileScanner; organizer: IFileOrganizer } {
  const logger = new Logger(config.logLevel);
  return {
    scanner: new FileScanner(config, logger),
    organizer: new FileOrganizer(config, logger)
  };
}
```

**Rules for Extract Method:**

- [ ] Each method does ONE thing (Single Responsibility)
- [ ] Method name describes WHAT, not HOW
- [ ] Maximum method length: 20 lines
- [ ] Maximum parameters: 3 (use options object for more)
- [ ] No side effects in query methods

### 3. Replace Conditional with Polymorphism

Use strategy pattern instead of switch/if-else chains for behavior variation.

**❌ Before (Conditional Logic):**

```typescript
function formatOutput(data: IOrganizationResult, format: string): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  } else if (format === 'csv') {
    const headers = 'type,originalPath,newPath,reason\n';
    const rows = data.operations.map(op => 
      `${op.type},${op.originalPath},${op.newPath},${op.reason}`
    ).join('\n');
    return headers + rows;
  } else if (format === 'table') {
    // 20 lines of table formatting
  } else {
    throw new Error(`Unknown format: ${format}`);
  }
}
```

**✅ After (Strategy Pattern):**

```typescript
interface IOutputFormatter {
  format(data: IOrganizationResult): string;
}

class JsonFormatter implements IOutputFormatter {
  format(data: IOrganizationResult): string {
    return JSON.stringify(data, null, 2);
  }
}

class CsvFormatter implements IOutputFormatter {
  format(data: IOrganizationResult): string {
    const headers = 'type,originalPath,newPath,reason\n';
    const rows = data.operations.map(this.formatRow).join('\n');
    return headers + rows;
  }

  private formatRow(op: IFileOperation): string {
    return `${op.type},${op.originalPath},${op.newPath},${op.reason}`;
  }
}

class TableFormatter implements IOutputFormatter {
  format(data: IOrganizationResult): string {
    return this.buildTable(data.operations);
  }

  private buildTable(operations: IFileOperation[]): string {
    // Clean table building logic
  }
}

// Usage with factory
class FormatterFactory {
  private static readonly formatters: Map<string, IOutputFormatter> = new Map([
    ['json', new JsonFormatter()],
    ['csv', new CsvFormatter()],
    ['table', new TableFormatter()]
  ]);

  static create(format: string): IOutputFormatter {
    const formatter = this.formatters.get(format);
    if (!formatter) throw new UnsupportedFormatError(format);
    return formatter;
  }
}
```

### 4. Tighten Code Patterns

Apply these micro-patterns consistently throughout implementation.

#### 4.1 Prefer Const Over Let

```typescript
// ❌ Avoid
let result = [];
for (const file of files) {
  result.push(processFile(file));
}

// ✅ Prefer
const result = files.map(file => processFile(file));
```

#### 4.2 Use Nullish Coalescing and Optional Chaining

```typescript
// ❌ Avoid
const logLevel = options.logLevel !== undefined && options.logLevel !== null 
  ? options.logLevel 
  : 'info';
const category = file && file.category ? file.category.name : 'unknown';

// ✅ Prefer
const logLevel = options.logLevel ?? 'info';
const category = file?.category?.name ?? 'unknown';
```

#### 4.3 Destructure at Point of Use

```typescript
// ❌ Avoid
function processConfig(config: IOrderlyConfig): void {
  const categories = config.categories;
  const namingConvention = config.namingConvention;
  const excludePatterns = config.excludePatterns;
  // use variables...
}

// ✅ Prefer
function processConfig(config: IOrderlyConfig): void {
  const { categories, namingConvention, excludePatterns } = config;
  // use variables...
}
```

#### 4.4 Use Object Spread for Immutable Updates

```typescript
// ❌ Avoid
function updateConfig(config: IOrderlyConfig, overrides: Partial<IOrderlyConfig>): IOrderlyConfig {
  const newConfig = Object.assign({}, config);
  if (overrides.dryRun !== undefined) newConfig.dryRun = overrides.dryRun;
  if (overrides.logLevel !== undefined) newConfig.logLevel = overrides.logLevel;
  return newConfig;
}

// ✅ Prefer
function updateConfig(config: IOrderlyConfig, overrides: Partial<IOrderlyConfig>): IOrderlyConfig {
  return { ...config, ...overrides };
}
```

#### 4.5 Use Array Methods Over Loops

```typescript
// ❌ Avoid
function countByCategory(files: IScannedFile[]): Map<string, number> {
  const result = new Map<string, number>();
  for (let i = 0; i < files.length; i++) {
    const category = files[i].category ?? 'unknown';
    const current = result.get(category) ?? 0;
    result.set(category, current + 1);
  }
  return result;
}

// ✅ Prefer
function countByCategory(files: IScannedFile[]): Map<string, number> {
  return files.reduce((acc, file) => {
    const category = file.category ?? 'unknown';
    acc.set(category, (acc.get(category) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
}
```

#### 4.6 Use Template Literals

```typescript
// ❌ Avoid
const message = 'Processing ' + files.length + ' files in ' + directory;
const path = baseDir + '/' + category + '/' + filename;

// ✅ Prefer
const message = `Processing ${files.length} files in ${directory}`;
const path = `${baseDir}/${category}/${filename}`;
```

### 5. Compose Method

Structure methods as a sequence of steps at the same abstraction level.

**❌ Before (Mixed Abstraction Levels):**

```typescript
async organizeFiles(directory: string): Promise<IOrganizationResult> {
  const files = await glob('**/*', { cwd: directory });
  const scannedFiles: IScannedFile[] = [];
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stats = fs.statSync(fullPath);
    if (stats.isFile()) {
      const ext = path.extname(file);
      const category = this.categories.find(c => c.extensions.includes(ext));
      scannedFiles.push({
        originalPath: fullPath,
        filename: path.basename(file),
        extension: ext,
        size: stats.size,
        category: category?.name,
        targetFolder: category?.targetFolder,
        requiresRename: this.checkRequiresRename(file)
      });
    }
  }
  
  const operations = scannedFiles
    .filter(f => f.category || f.requiresRename)
    .map(f => this.createOperation(f));
  
  // ... execution logic
}
```

**✅ After (Composed Method):**

```typescript
async organizeFiles(directory: string): Promise<IOrganizationResult> {
  const files = await this.scanDirectory(directory);
  const operations = this.planOperations(files);
  return this.executeOperations(operations);
}

private async scanDirectory(directory: string): Promise<IScannedFile[]> {
  const filePaths = await this.discoverFiles(directory);
  return filePaths
    .map(filePath => this.analyzeFile(filePath))
    .filter((file): file is IScannedFile => file !== null);
}

private analyzeFile(filePath: string): IScannedFile | null {
  if (!this.isFile(filePath)) return null;

  const { filename, extension } = this.parseFilePath(filePath);
  const category = this.categorizer.categorize(extension, filename);

  return {
    originalPath: filePath,
    filename,
    extension,
    size: this.fileSystem.statSync(filePath).size,
    category: category?.name,
    targetFolder: category?.targetFolder,
    requiresRename: this.fileNamer.requiresTransform(filename)
  };
}

private planOperations(files: IScannedFile[]): IFileOperation[] {
  return files
    .filter(this.needsOperation)
    .map(file => this.createOperation(file));
}

private needsOperation(file: IScannedFile): boolean {
  return Boolean(file.category || file.requiresRename);
}
```

### Refactoring Checklist

Apply these checks during code review:

**Guard Clauses:**

- [ ] No method exceeds 2 levels of nesting
- [ ] Null checks appear at method start
- [ ] Error conditions return/throw early
- [ ] Happy path is at lowest indent level

**Extract Method:**

- [ ] No method exceeds 20 lines
- [ ] Method names are verbs describing action
- [ ] Each method has single responsibility
- [ ] No duplicate code blocks

**Polymorphism:**

- [ ] No switch statements on type codes
- [ ] Behavior variations use strategy pattern
- [ ] New variants don't require modifying existing code

**Code Tightening:**

- [ ] All variables are `const` unless reassigned
- [ ] Nullish coalescing (`??`) used over `||` for defaults
- [ ] Optional chaining (`?.`) used for nested access
- [ ] Array methods used over manual loops
- [ ] Template literals used for string building
- [ ] Destructuring used at point of need

---

## Core Interface Architecture

### Interface Hierarchy

The following interfaces define the core contracts for the Orderly system. All interfaces should be defined in dedicated `types.ts` or `interfaces.ts` files within their respective modules.

### 1. File System Abstraction

**Location:** `src/types/file-system.ts`

```typescript
/**
 * Abstraction over file system operations.
 * Enables testing without actual file system access.
 */
export interface IFileSystem {
  existsSync(filePath: string): boolean;
  readFileSync(filePath: string): string;
  writeFileSync(filePath: string, content: string): void;
  appendFileSync(filePath: string, content: string): void;
  mkdirSync(dirPath: string): void;
  renameSync(oldPath: string, newPath: string): void;
  statSync(filePath: string): IFileStats;
}

export interface IFileStats {
  isFile(): boolean;
  isDirectory(): boolean;
  size: number;
  mtime: Date;
}
```

### 2. Logging Abstraction

**Location:** `src/types/logging.ts`

```typescript
/**
 * Logging interface for consistent log output across the application.
 */
export interface ILogger {
  debug(message: string, details?: unknown): void;
  info(message: string, details?: unknown): void;
  warn(message: string, details?: unknown): void;
  error(message: string, details?: unknown): void;
  getLogs(): ILogEntry[];
}

export interface ILogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: unknown;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}
```

### 3. Configuration Abstraction

**Location:** `src/config/interfaces.ts`

```typescript
/**
 * Configuration loading and persistence interface.
 */
export interface IConfigLoader {
  load(configPath?: string): IOrderlyConfig;
  save(config: IOrderlyConfig, filePath: string): void;
}

/**
 * Configuration parsing interface for different formats.
 */
export interface IConfigParser {
  parse(filePath: string): Partial<IOrderlyConfig>;
  stringify(config: IOrderlyConfig, format: ConfigFormat): string;
}

/**
 * Main configuration interface.
 */
export interface IOrderlyConfig {
  categories: ICategoryRule[];
  namingConvention: INamingConvention;
  excludePatterns: string[];
  includeHidden: boolean;
  dryRun: boolean;
  generateManifest: boolean;
  logLevel: LogLevel;
  logFile?: string;
  targetDirectory?: string;
}

export interface ICategoryRule {
  name: string;
  extensions: string[];
  patterns?: string[];
  targetFolder?: string;
}

export interface INamingConvention {
  type: NamingConventionType;
  lowercase?: boolean;
}

export enum NamingConventionType {
  KEBAB_CASE = 'kebab-case',
  SNAKE_CASE = 'snake_case',
  CAMEL_CASE = 'camelCase',
  PASCAL_CASE = 'PascalCase'
}

export enum ConfigFormat {
  JSON = 'json',
  YAML = 'yaml'
}
```

### 4. Scanner Abstraction

**Location:** `src/scanner/interfaces.ts`

```typescript
/**
 * File scanning interface for discovering files to organize.
 */
export interface IFileScanner {
  scan(directory: string): Promise<IScannedFile[]>;
  getCategorySummary(files: IScannedFile[]): Map<string, number>;
}

/**
 * Represents a file discovered during scanning.
 * Contains all metadata needed for organization decisions.
 */
export interface IScannedFile {
  /** Absolute path to the original file location */
  originalPath: string;
  /** File name with extension */
  filename: string;
  /** File extension including the dot (e.g., '.jpg') */
  extension: string;
  /** File size in bytes */
  size: number;
  /** Matched category name, if any */
  category?: string;
  /** Target folder for categorized files */
  targetFolder?: string;
  /** Whether the file needs renaming per naming convention */
  requiresRename: boolean;
  /** New filename if renaming is required */
  proposedName?: string;
}
```

### 5. Organizer Abstraction

**Location:** `src/organizer/interfaces.ts`

```typescript
/**
 * Main file organization orchestrator interface.
 */
export interface IFileOrganizer {
  planOperations(files: IScannedFile[]): IFileOperation[];
  executeOperations(operations: IFileOperation[]): IOrganizationResult;
}

/**
 * Operation planning interface - determines what operations to perform.
 */
export interface IOperationPlanner {
  plan(files: IScannedFile[]): IFileOperation[];
}

/**
 * Operation execution interface - performs the actual file operations.
 */
export interface IOperationExecutor {
  execute(operations: IFileOperation[]): IOrganizationResult;
}

/**
 * File categorization interface.
 */
export interface IFileCategorizer {
  categorize(extension: string, filename: string, categories: ICategoryRule[]): ICategoryRule | undefined;
}

/**
 * File naming convention transformer.
 * Applies naming rules (kebab-case, snake_case, etc.) to filenames.
 */
export interface IFileNamer {
  transform(filename: string, convention: INamingConvention): string;
  requiresTransform(filename: string, convention: INamingConvention): boolean;
}
```

### 6. Operation Types

**Location:** `src/organizer/types.ts`

```typescript
/**
 * Types of file operations that can be performed.
 */
export enum FileOperationType {
  MOVE = 'move',
  RENAME = 'rename',
  MOVE_RENAME = 'move-rename'
}

/**
 * Represents a planned or executed file operation.
 */
export interface IFileOperation {
  type: FileOperationType;
  originalPath: string;
  newPath: string;
  reason: string;
}

/**
 * Result of organizing files.
 */
export interface IOrganizationResult {
  operations: IFileOperation[];
  successful: number;
  failed: number;
  errors: IFileError[];
}

/**
 * Represents an error that occurred during file operations.
 */
export interface IFileError {
  file: string;
  error: string;
}
```

### 7. Manifest Abstraction

**Location:** `src/organizer/manifest-interfaces.ts`

```typescript
/**
 * Manifest generation interface.
 */
export interface IManifestGenerator {
  generate(result: IOrganizationResult, errors: IFileError[]): IManifest;
  save(manifest: IManifest, outputPath: string): void;
  saveMarkdown(manifest: IManifest, outputPath: string): void;
}

/**
 * Manifest building interface.
 */
export interface IManifestBuilder {
  build(result: IOrganizationResult, errors: IFileError[]): IManifest;
}

/**
 * Manifest formatting interface.
 */
export interface IManifestFormatter {
  format(manifest: IManifest): string;
}

/**
 * Operation execution status.
 */
export enum OperationStatus {
  SUCCESS = 'success',
  FAILED = 'failed'
}

/**
 * Single entry in a manifest.
 */
export interface IManifestEntry {
  timestamp: string;
  operation: IFileOperation;
  status: OperationStatus;
  error?: string;
}

/**
 * Complete manifest of operations performed.
 */
export interface IManifest {
  generatedAt: string;
  totalOperations: number;
  successful: number;
  failed: number;
  entries: IManifestEntry[];
}
```

### 8. Output Abstraction

**Location:** `src/types/output.ts`

```typescript
/**
 * Output format enumeration.
 */
export enum OutputFormat {
  JSON = 'json',
  CSV = 'csv',
  TABLE = 'table'
}

/**
 * Console output interface for CLI display.
 */
export interface IOutputWriter {
  success(message: string): void;
  info(message: string): void;
  warning(message: string): void;
  error(message: string): void;
  write(message: string): void;
  newLine(): void;
  table<T extends Record<string, unknown>>(data: T[], columns?: string[]): void;
}
```

### Interface-to-Implementation Mapping

| Interface | Current Implementation | Notes |
|-----------|----------------------|-------|
| `IFileSystem` | `FileSystemUtils` | Static class → should become instance |
| `ILogger` | `Logger` | Already good, add interface |
| `IConfigLoader` | `ConfigLoader` | Static class → should become instance |
| `IConfigParser` | `ConfigParser` | Static class → should become instance |
| `IFileScanner` | `FileScanner` | Already good, add interface |
| `IFileOrganizer` | `FileOrganizer` | Already good, add interface |
| `IOperationPlanner` | `OperationPlanner` | Already good, add interface |
| `IOperationExecutor` | `OperationExecutor` | Already good, add interface |
| `IFileCategorizer` | `FileCategorizer` | Static class → should become instance |
| `IFileNamer` | `FileNamer` | Static class → should become instance |
| `IManifestGenerator` | `ManifestGenerator` | Already good, add interface |
| `IManifestBuilder` | `ManifestBuilder` | Already good, add interface |
| `IManifestFormatter` | `ManifestFormatter` | Already good, add interface |
| `IOutputWriter` | `ConsoleOutputWriter` | Already good, add interface |
| `IDedupeService` | `DedupeService` | **NEW** - Dedupe orchestration |
| `IDedupeStrategy` | Various strategies | **NEW** - Strategy pattern for matching |
| `IDedupeHasher` | `Sha256Hasher` | **NEW** - File hashing abstraction |
| `IMetadataExtractor` | `MetadataExtractor` | **NEW** - Image/EXIF metadata |
| `IDedupeReportWriter` | `DedupeReportWriter` | **NEW** - Report generation |

### Dependency Injection Pattern

With interfaces defined, classes should receive dependencies through constructor injection:

**Before (Tight Coupling):**

```typescript
export class FileScanner {
  constructor(
    private config: OrderlyConfig,
    private logger: Logger  // Concrete class
  ) {}

  private processFile(directory: string, file: string): ScannedFile | null {
    const stats = FileSystemUtils.statSync(fullPath);  // Static call - untestable
    const category = FileCategorizer.categorize(...);   // Static call - untestable
  }
}
```

**After (Loose Coupling via IDD):**

```typescript
export class FileScanner implements IFileScanner {
  constructor(
    private readonly config: IOrderlyConfig,
    private readonly logger: ILogger,
    private readonly fileSystem: IFileSystem,
    private readonly categorizer: IFileCategorizer
  ) {}

  private processFile(directory: string, file: string): IScannedFile | null {
    const stats = this.fileSystem.statSync(fullPath);    // Mockable
    const category = this.categorizer.categorize(...);   // Mockable
  }
}
```

### Testing with Interfaces

Interfaces enable easy mocking for unit tests:

```typescript
describe('FileScanner', () => {
  let scanner: FileScanner;
  let mockLogger: jest.Mocked<ILogger>;
  let mockFileSystem: jest.Mocked<IFileSystem>;
  let mockCategorizer: jest.Mocked<IFileCategorizer>;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      getLogs: jest.fn()
    };

    mockFileSystem = {
      existsSync: jest.fn(),
      readFileSync: jest.fn(),
      statSync: jest.fn().mockReturnValue({ isFile: () => true, size: 100 }),
      // ... other methods
    };

    mockCategorizer = {
      categorize: jest.fn().mockReturnValue({ name: 'images', targetFolder: 'images' })
    };

    scanner = new FileScanner(config, mockLogger, mockFileSystem, mockCategorizer);
  });

  it('should categorize files correctly', async () => {
    mockFileSystem.statSync.mockReturnValue({ isFile: () => true, size: 500 });
    
    const files = await scanner.scan('/test/dir');
    
    expect(mockCategorizer.categorize).toHaveBeenCalled();
  });
});
```

---

## Improvement Areas

### 1. Consolidate Duplicate ConfigFormat Enum

#### Current State Analysis

**Problem:** `ConfigFormat` enum is defined in two locations, violating the Single Source of Truth principle essential to IDD.

**Current Files Affected:**

- `src/config/types.ts` (lines 8-11)
- `src/config/config-loader.ts` (lines 6-9)

**Current Code in `config-loader.ts`:**

```typescript
enum ConfigFormat {
  JSON = 'json',
  YAML = 'yaml'
}
```

**Current Code in `types.ts`:**

```typescript
export enum ConfigFormat {
  JSON = 'json',
  YAML = 'yaml'
}
```

#### Target State (IDD Compliant)

**Expected Outcome:**

- Single source of truth for `ConfigFormat` in the types/interfaces layer
- `config-loader.ts` imports from the interface layer
- All enums are co-located with their related interfaces

**Target Code in `config-loader.ts`:**

```typescript
import { OrderlyConfig, DEFAULT_CONFIG, ConfigFormat } from './types';
```

#### Implementation Steps

1. Update import statement in `src/config/config-loader.ts` to include `ConfigFormat`
2. Remove local `ConfigFormat` enum definition from `config-loader.ts`
3. Verify all usages compile correctly
4. Run existing tests to ensure no regressions

#### Task Checklist

**Implementation Tasks:**

- [ ] Update import statement in `src/config/config-loader.ts` to include `ConfigFormat`
- [ ] Remove local `ConfigFormat` enum definition from `config-loader.ts`
- [ ] Verify all usages compile correctly
- [ ] Run existing tests to ensure no regressions

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] `grep -r "enum ConfigFormat" src/` returns exactly one result in `types.ts`
- [ ] No TypeScript errors related to `ConfigFormat` imports

**Validation Criteria:**

- [ ] `config-loader.ts` imports `ConfigFormat` from `./types`
- [ ] No local `ConfigFormat` enum exists in `config-loader.ts`
- [ ] All files referencing `ConfigFormat` import from a single source
- [ ] Existing functionality unchanged (manual smoke test)

**TDD Test Specifications:**

*File: `src/config/config-loader.test.ts` (update existing)*

```typescript
import { ConfigLoader } from './config-loader';
import { ConfigFormat } from './types';

describe('ConfigLoader', () => {
  describe('ConfigFormat import consolidation', () => {
    it('should use ConfigFormat.JSON for JSON config files', () => {
      // Given: A JSON config file path
      const configPath = '/path/to/orderly.config.json';
      
      // When: ConfigLoader processes the file
      // Then: ConfigFormat.JSON is used internally
      expect(ConfigFormat.JSON).toBe('json');
    });

    it('should use ConfigFormat.YAML for YAML config files', () => {
      // Given: A YAML config file path (.yml or .yaml)
      const yamlPath = '/path/to/.orderly.yml';
      
      // When: ConfigLoader processes the file
      // Then: ConfigFormat.YAML is used internally
      expect(ConfigFormat.YAML).toBe('yaml');
    });

    it('should have ConfigFormat exported from types module', () => {
      // Given: The ConfigFormat enum from types module
      // Then: All expected values are present
      expect(ConfigFormat.JSON).toBe('json');
      expect(ConfigFormat.YAML).toBe('yaml');
      expect(Object.keys(ConfigFormat)).toHaveLength(2);
    });
  });
});
```

---

### 2. Extract Organizer Interfaces to Dedicated Types File

#### Current State Analysis

**Problem:** Interfaces are embedded in implementation files, violating the IDD principle that interfaces should be defined separately from implementations.

**Current Locations:**

| Interface | Current Location |
| --------- | ---------------- |
| `FileError` | `src/organizer/file-organizer.ts` |
| `FileOperationType` | `src/organizer/file-organizer.ts` |
| `FileOperation` | `src/organizer/file-organizer.ts` |
| `OrganizationResult` | `src/organizer/file-organizer.ts` |
| `ScannedFile` | `src/scanner/file-scanner.ts` |
| `ManifestEntry` | `src/organizer/manifest-generator.ts` |
| `Manifest` | `src/organizer/manifest-generator.ts` |
| `OperationStatus` | `src/organizer/manifest-generator.ts` |

**Current `file-organizer.ts` structure (Anti-Pattern):**

```typescript
// ❌ Interfaces mixed with implementation
export interface FileError { ... }
export enum FileOperationType { ... }
export interface FileOperation { ... }
export interface OrganizationResult { ... }

// Class implementation follows
export class FileOrganizer { ... }
```

#### Target State (IDD Compliant)

**New File Structure:**

```
src/organizer/
├── interfaces.ts               # NEW: All organizer interfaces
├── types.ts                    # NEW: Enums and type aliases
├── file-organizer.ts           # Class implements IFileOrganizer
├── manifest-generator.ts       # Class implements IManifestGenerator
├── operation-planner.ts        # Class implements IOperationPlanner
├── operation-executor.ts       # Class implements IOperationExecutor
├── manifest-builder.ts         # Class implements IManifestBuilder
├── manifest-formatter.ts       # Class implements IManifestFormatter
└── *.test.ts files
```

**New `src/organizer/interfaces.ts`:**

```typescript
import { IScannedFile } from '../scanner/interfaces';
import { IFileOperation, IOrganizationResult, IFileError } from './types';

/**
 * Main file organization orchestrator interface.
 * Coordinates planning and execution of file operations.
 */
export interface IFileOrganizer {
  /**
   * Plans operations for a set of scanned files.
   * @param files - Files discovered during scanning
   * @returns Planned file operations
   */
  planOperations(files: IScannedFile[]): IFileOperation[];

  /**
   * Executes planned file operations.
   * @param operations - Operations to execute
   * @returns Result summary with success/failure counts
   */
  executeOperations(operations: IFileOperation[]): IOrganizationResult;
}

/**
 * Operation planning interface.
 * Determines what operations need to be performed on files.
 */
export interface IOperationPlanner {
  /**
   * Creates a plan of operations for the given files.
   * @param files - Scanned files to plan operations for
   * @returns Array of planned operations
   */
  plan(files: IScannedFile[]): IFileOperation[];
}

/**
 * Operation execution interface.
 * Performs actual file system operations.
 */
export interface IOperationExecutor {
  /**
   * Executes file operations.
   * @param operations - Operations to execute
   * @returns Result with counts and any errors
   */
  execute(operations: IFileOperation[]): IOrganizationResult;
}
```

**New `src/organizer/types.ts`:**

```typescript
/**
 * Types of file operations that can be performed.
 */
export enum FileOperationType {
  MOVE = 'move',
  RENAME = 'rename',
  MOVE_RENAME = 'move-rename'
}

/**
 * Represents a planned or executed file operation.
 */
export interface IFileOperation {
  readonly type: FileOperationType;
  readonly originalPath: string;
  readonly newPath: string;
  readonly reason: string;
}

/**
 * Result of organizing files.
 */
export interface IOrganizationResult {
  readonly operations: IFileOperation[];
  readonly successful: number;
  readonly failed: number;
  readonly errors: IFileError[];
}

/**
 * Represents an error during file operations.
 */
export interface IFileError {
  readonly file: string;
  readonly error: string;
}

/**
 * Operation execution status.
 */
export enum OperationStatus {
  SUCCESS = 'success',
  FAILED = 'failed'
}

/**
 * Single entry in a manifest.
 */
export interface IManifestEntry {
  readonly timestamp: string;
  readonly operation: IFileOperation;
  readonly status: OperationStatus;
  readonly error?: string;
}

/**
 * Complete manifest of operations performed.
 */
export interface IManifest {
  readonly generatedAt: string;
  readonly totalOperations: number;
  readonly successful: number;
  readonly failed: number;
  readonly entries: IManifestEntry[];
}
```

**Updated `file-organizer.ts` (IDD Pattern):**

```typescript
import { IFileOrganizer, IOperationPlanner, IOperationExecutor } from './interfaces';
import { IFileOperation, IOrganizationResult } from './types';
import { IScannedFile } from '../scanner/interfaces';
import { ILogger } from '../types/logging';

// Re-export for backward compatibility
export * from './interfaces';
export * from './types';

export class FileOrganizer implements IFileOrganizer {
  constructor(
    private readonly planner: IOperationPlanner,
    private readonly executor: IOperationExecutor,
    private readonly logger: ILogger
  ) {}

  planOperations(files: IScannedFile[]): IFileOperation[] {
    const operations = this.planner.plan(files);
    this.logger.info(`Planned ${operations.length} operations`);
    return operations;
  }

  executeOperations(operations: IFileOperation[]): IOrganizationResult {
    return this.executor.execute(operations);
  }
}
```

#### Implementation Steps

1. Create `src/organizer/interfaces.ts` with all behavior interfaces
2. Create `src/organizer/types.ts` with data types and enums
3. Create `src/scanner/interfaces.ts` with scanner interfaces
4. Update `src/organizer/file-organizer.ts`:
   - Add `implements IFileOrganizer`
   - Change constructor to accept interfaces
   - Remove interface/enum definitions
   - Re-export types for backward compatibility
5. Update `src/organizer/operation-planner.ts`:
   - Add `implements IOperationPlanner`
6. Update `src/organizer/operation-executor.ts`:
   - Add `implements IOperationExecutor`
7. Update `src/organizer/manifest-generator.ts`:
   - Add `implements IManifestGenerator`
   - Remove interface/enum definitions
8. Update all imports across the codebase
9. Update `src/index.ts` to export interfaces
10. Update all test files with new import paths
11. Verify build and tests

#### Task Checklist

**Implementation Tasks:**

- [ ] Create `src/organizer/interfaces.ts` with all behavior interfaces
- [ ] Create `src/organizer/types.ts` with data types and enums
- [ ] Create `src/scanner/interfaces.ts` with scanner interfaces
- [ ] Update `src/organizer/file-organizer.ts` to implement `IFileOrganizer`
- [ ] Update `src/organizer/operation-planner.ts` to implement `IOperationPlanner`
- [ ] Update `src/organizer/operation-executor.ts` to implement `IOperationExecutor`
- [ ] Update `src/organizer/manifest-generator.ts` to implement `IManifestGenerator`
- [ ] Remove interface/enum definitions from implementation files
- [ ] Add re-exports for backward compatibility
- [ ] Update all imports across the codebase
- [ ] Update `src/index.ts` to export interfaces
- [ ] Update all test files with new import paths

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] `npm run lint` shows no new warnings
- [ ] No circular dependency warnings from bundler

**Validation Criteria:**

- [ ] `src/organizer/interfaces.ts` exists and exports `IFileOrganizer`, `IOperationPlanner`, `IOperationExecutor`
- [ ] `src/organizer/types.ts` exists and exports `FileOperationType`, `IFileOperation`, `IOrganizationResult`
- [ ] `src/scanner/interfaces.ts` exists and exports `IFileScanner`, `IScannedFile`
- [ ] All public exports still available from `src/index.ts`
- [ ] All classes have corresponding `implements I*` declarations
- [ ] Interfaces are in separate files from implementations
- [ ] No interface definitions remain in implementation files

**TDD Test Specifications:**

*File: `src/organizer/file-organizer.test.ts` (update existing)*

```typescript
import type { IFileOrganizer, IOperationPlanner, IOperationExecutor } from './interfaces';
import type { IFileOperation, IOrganizationResult } from './types';
import type { IScannedFile } from '../scanner/interfaces';
import type { ILogger } from '../types/logging';
import { FileOrganizer } from './file-organizer';
import { FileOperationType } from './types';

describe('FileOrganizer', () => {
  describe('IFileOrganizer contract', () => {
    let organizer: IFileOrganizer;
    let mockPlanner: jest.Mocked<IOperationPlanner>;
    let mockExecutor: jest.Mocked<IOperationExecutor>;
    let mockLogger: jest.Mocked<ILogger>;

    const mockScannedFile: IScannedFile = {
      originalPath: '/test/file.jpg',
      filename: 'file.jpg',
      extension: '.jpg',
      size: 1024,
      category: 'images',
      targetFolder: 'images',
      requiresRename: false
    };

    const mockOperation: IFileOperation = {
      type: FileOperationType.MOVE,
      originalPath: '/test/file.jpg',
      newPath: '/test/images/file.jpg',
      reason: 'Categorized as images'
    };

    const mockResult: IOrganizationResult = {
      operations: [mockOperation],
      successful: 1,
      failed: 0,
      errors: []
    };

    beforeEach(() => {
      mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        getLogs: jest.fn().mockReturnValue([])
      };
      mockPlanner = { plan: jest.fn() };
      mockExecutor = { execute: jest.fn() };
      organizer = new FileOrganizer(mockPlanner, mockExecutor, mockLogger);
    });

    it('should implement IFileOrganizer interface', () => {
      // Then: FileOrganizer has all IFileOrganizer methods
      expect(organizer.planOperations).toBeDefined();
      expect(organizer.executeOperations).toBeDefined();
      expect(typeof organizer.planOperations).toBe('function');
      expect(typeof organizer.executeOperations).toBe('function');
    });

    it('should delegate planning to IOperationPlanner', () => {
      // Given: Scanned files
      const files: IScannedFile[] = [mockScannedFile];
      mockPlanner.plan.mockReturnValue([mockOperation]);
      
      // When: Planning operations
      const result = organizer.planOperations(files);
      
      // Then: Delegates to injected planner
      expect(mockPlanner.plan).toHaveBeenCalledWith(files);
      expect(result).toEqual([mockOperation]);
    });

    it('should delegate execution to IOperationExecutor', () => {
      // Given: Planned operations
      const operations: IFileOperation[] = [mockOperation];
      mockExecutor.execute.mockReturnValue(mockResult);
      
      // When: Executing operations
      const result = organizer.executeOperations(operations);
      
      // Then: Delegates to injected executor
      expect(mockExecutor.execute).toHaveBeenCalledWith(operations);
      expect(result).toEqual(mockResult);
    });
  });
});
```

*File: `src/organizer/operation-planner.test.ts` (update existing)*

```typescript
import type { IOperationPlanner } from './interfaces';
import type { IFileOperation } from './types';
import type { IScannedFile } from '../scanner/interfaces';
import type { ILogger } from '../types/logging';
import type { IOrderlyConfig } from '../config/interfaces';
import { OperationPlanner } from './operation-planner';
import { FileOperationType } from './types';

describe('OperationPlanner', () => {
  describe('IOperationPlanner contract', () => {
    let planner: IOperationPlanner;
    let mockConfig: IOrderlyConfig;
    let mockLogger: jest.Mocked<ILogger>;

    const mockScannedFile: IScannedFile = {
      originalPath: '/test/file.jpg',
      filename: 'file.jpg',
      extension: '.jpg',
      size: 1024,
      category: 'images',
      targetFolder: 'images',
      requiresRename: false
    };

    beforeEach(() => {
      mockConfig = {
        categories: [],
        namingConvention: { type: 'kebab-case' as const },
        excludePatterns: [],
        includeHidden: false,
        dryRun: false,
        generateManifest: false,
        logLevel: 'info' as const
      };
      mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        getLogs: jest.fn().mockReturnValue([])
      };
      planner = new OperationPlanner(mockConfig, mockLogger);
    });

    it('should implement IOperationPlanner interface', () => {
      expect(planner.plan).toBeDefined();
      expect(typeof planner.plan).toBe('function');
    });

    it('should return IFileOperation[] from plan()', () => {
      // Given: Scanned files needing operations
      const files: IScannedFile[] = [mockScannedFile];
      
      // When: Planning
      const operations = planner.plan(files);
      
      // Then: Returns array of IFileOperation
      expect(Array.isArray(operations)).toBe(true);
      operations.forEach(op => {
        expect(op).toHaveProperty('type');
        expect(op).toHaveProperty('originalPath');
        expect(op).toHaveProperty('newPath');
        expect(op).toHaveProperty('reason');
      });
    });
  });
});
```

*File: `src/organizer/operation-executor.test.ts` (update existing)*

```typescript
import type { IOperationExecutor } from './interfaces';
import type { IFileOperation, IOrganizationResult } from './types';
import type { ILogger } from '../types/logging';
import type { IFileSystem } from '../types/file-system';
import type { IOrderlyConfig } from '../config/interfaces';
import { OperationExecutor } from './operation-executor';
import { FileOperationType } from './types';

describe('OperationExecutor', () => {
  describe('IOperationExecutor contract', () => {
    let executor: IOperationExecutor;
    let mockFileSystem: jest.Mocked<IFileSystem>;
    let mockLogger: jest.Mocked<ILogger>;
    let mockConfig: IOrderlyConfig;

    const mockOperation: IFileOperation = {
      type: FileOperationType.MOVE,
      originalPath: '/test/file.jpg',
      newPath: '/test/images/file.jpg',
      reason: 'Categorized as images'
    };

    beforeEach(() => {
      mockFileSystem = {
        existsSync: jest.fn(),
        readFileSync: jest.fn(),
        writeFileSync: jest.fn(),
        appendFileSync: jest.fn(),
        mkdirSync: jest.fn(),
        renameSync: jest.fn(),
        statSync: jest.fn()
      };
      mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        getLogs: jest.fn().mockReturnValue([])
      };
      mockConfig = {
        categories: [],
        namingConvention: { type: 'kebab-case' as const },
        excludePatterns: [],
        includeHidden: false,
        dryRun: false,
        generateManifest: false,
        logLevel: 'info' as const
      };
      executor = new OperationExecutor(mockConfig, mockLogger, mockFileSystem);
    });

    it('should implement IOperationExecutor interface', () => {
      expect(executor.execute).toBeDefined();
      expect(typeof executor.execute).toBe('function');
    });

    it('should return IOrganizationResult from execute()', () => {
      // Given: Operations to execute
      const operations: IFileOperation[] = [mockOperation];
      mockFileSystem.existsSync.mockReturnValue(false);
      
      // When: Executing operations
      const result = executor.execute(operations);
      
      // Then: Returns IOrganizationResult with required fields
      expect(result).toHaveProperty('operations');
      expect(result).toHaveProperty('successful');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('errors');
      expect(typeof result.successful).toBe('number');
      expect(typeof result.failed).toBe('number');
    });
  });
});
```

*File: `src/scanner/file-scanner.test.ts` (update existing)*

```typescript
import type { IFileScanner, IScannedFile } from './interfaces';
import type { ILogger } from '../types/logging';
import type { IFileSystem } from '../types/file-system';
import type { IFileCategorizer } from '../types/categorizer';
import type { IOrderlyConfig } from '../config/interfaces';
import { FileScanner } from './file-scanner';

describe('FileScanner', () => {
  describe('IFileScanner contract', () => {
    let scanner: IFileScanner;
    let mockLogger: jest.Mocked<ILogger>;
    let mockFileSystem: jest.Mocked<IFileSystem>;
    let mockCategorizer: jest.Mocked<IFileCategorizer>;
    let mockConfig: IOrderlyConfig;

    beforeEach(() => {
      mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        getLogs: jest.fn().mockReturnValue([])
      };
      mockFileSystem = {
        existsSync: jest.fn().mockReturnValue(true),
        readFileSync: jest.fn(),
        writeFileSync: jest.fn(),
        appendFileSync: jest.fn(),
        mkdirSync: jest.fn(),
        renameSync: jest.fn(),
        statSync: jest.fn().mockReturnValue({
          isFile: () => true,
          isDirectory: () => false,
          size: 1024,
          mtime: new Date()
        })
      };
      mockCategorizer = {
        categorize: jest.fn().mockReturnValue({
          name: 'images',
          extensions: ['.jpg'],
          targetFolder: 'images'
        })
      };
      mockConfig = {
        categories: [],
        namingConvention: { type: 'kebab-case' as const },
        excludePatterns: [],
        includeHidden: false,
        dryRun: false,
        generateManifest: false,
        logLevel: 'info' as const
      };
      scanner = new FileScanner(mockConfig, mockLogger, mockFileSystem, mockCategorizer);
    });

    it('should implement IFileScanner interface', () => {
      expect(scanner.scan).toBeDefined();
      expect(scanner.getCategorySummary).toBeDefined();
      expect(typeof scanner.scan).toBe('function');
      expect(typeof scanner.getCategorySummary).toBe('function');
    });

    it('should return IScannedFile[] from scan()', async () => {
      // When: Scanning directory
      const files = await scanner.scan('/test/dir');
      
      // Then: Returns array of IScannedFile
      expect(Array.isArray(files)).toBe(true);
      files.forEach(file => {
        expect(file).toHaveProperty('originalPath');
        expect(file).toHaveProperty('filename');
        expect(file).toHaveProperty('extension');
        expect(file).toHaveProperty('size');
        expect(file).toHaveProperty('requiresRename');
      });
    });

    it('should return category summary as Map', () => {
      // Given: Array of scanned files
      const files: IScannedFile[] = [
        { originalPath: '/a.jpg', filename: 'a.jpg', extension: '.jpg', size: 100, requiresRename: false, category: 'images' },
        { originalPath: '/b.jpg', filename: 'b.jpg', extension: '.jpg', size: 200, requiresRename: false, category: 'images' },
        { originalPath: '/c.pdf', filename: 'c.pdf', extension: '.pdf', size: 300, requiresRename: false, category: 'documents' }
      ];

      // When: Getting category summary
      const summary = scanner.getCategorySummary(files);

      // Then: Returns Map with category counts
      expect(summary).toBeInstanceOf(Map);
      expect(summary.get('images')).toBe(2);
      expect(summary.get('documents')).toBe(1);
    });
  });
});
```

```

---

### 3. Refactor CLI into Interface-Driven Modules

#### Current State Analysis

**Problem:** `src/cli.ts` is 256 lines with commands and helper functions mixed together, with no clear interface contracts.

**Current Structure (Anti-Pattern):**

```typescript
// src/cli.ts (256 lines) - Monolithic, no interfaces
- Import statements
- Interface definitions (OrganizeOptions, InitOptions, ScanOptions)
- Command: organize (inline)
- Command: init (inline)
- Command: scan (inline)
- Helper functions (mixed with commands)
```

#### Target State (IDD Compliant)

**New File Structure:**

```
src/cli/
├── index.ts                 # Main entry point, wires up dependencies
├── interfaces.ts            # CLI command and service interfaces
├── types.ts                 # CLI-specific types (options, results)
├── commands/
│   ├── index.ts            # Command exports
│   ├── organize.ts         # Implements IOrganizeCommand
│   ├── init.ts             # Implements IInitCommand
│   └── scan.ts             # Implements IScanCommand
└── services/
    ├── index.ts            # Service exports
    ├── config-service.ts   # Implements IConfigService
    ├── display-service.ts  # Implements IDisplayService
    ├── validation-service.ts # Implements IValidationService
    └── manifest-service.ts # Implements IManifestService
```

**New `src/cli/interfaces.ts`:**

```typescript
import { IOrderlyConfig } from '../config/interfaces';
import { IOrganizationResult } from '../organizer/types';
import { IScannedFile } from '../scanner/interfaces';
import { OrganizeOptions, InitOptions, ScanOptions } from './types';

/**
 * Command interfaces define the contract for CLI commands.
 */
export interface ICommand<TOptions = void> {
  execute(options: TOptions): Promise<void>;
}

export interface IOrganizeCommand extends ICommand<OrganizeOptions> {
  execute(options: OrganizeOptions): Promise<void>;
}

export interface IInitCommand extends ICommand<InitOptions> {
  execute(options: InitOptions): Promise<void>;
}

export interface IScanCommand extends ICommand<ScanOptions> {
  execute(options: ScanOptions): Promise<void>;
}

/**
 * Service interfaces for CLI helper functionality.
 */
export interface IConfigService {
  load(options: OrganizeOptions): IOrderlyConfig;
  validateFormat(format: string): string;
  getFilename(format: string): string;
}

export interface IDisplayService {
  logFileSummary(files: IScannedFile[], summary: Map<string, number>): void;
  logResults(result: IOrganizationResult): void;
  displayScanResults(files: IScannedFile[], summary: Map<string, number>): void;
  showError(error: unknown): void;
}

export interface IValidationService {
  validateDirectory(directory: string): string;
  validateConfigPath(configPath: string): void;
}

export interface IManifestService {
  save(result: IOrganizationResult): void;
}
```

**New `src/cli/types.ts`:**

```typescript
/**
 * CLI command option types.
 */
export interface OrganizeOptions {
  config?: string;
  dryRun?: boolean;
  manifest?: boolean;
  logLevel?: string;
  output?: string;
}

export interface InitOptions {
  format?: string;
}

export interface ScanOptions {
  config?: string;
  logLevel?: string;
}

/**
 * CLI exit codes for proper error handling.
 */
export enum ExitCode {
  SUCCESS = 0,
  ERROR = 1,
  INVALID_ARGS = 2
}
```

**Example Command Implementation (IDD Pattern):**

```typescript
// src/cli/commands/organize.ts
import { IOrganizeCommand, IConfigService, IDisplayService, IManifestService } from '../interfaces';
import { OrganizeOptions } from '../types';
import { IFileScanner } from '../../scanner/interfaces';
import { IFileOrganizer } from '../../organizer/interfaces';
import { ILogger } from '../../types/logging';

export class OrganizeCommand implements IOrganizeCommand {
  constructor(
    private readonly configService: IConfigService,
    private readonly displayService: IDisplayService,
    private readonly manifestService: IManifestService,
    private readonly scannerFactory: (config: IOrderlyConfig) => IFileScanner,
    private readonly organizerFactory: (config: IOrderlyConfig) => IFileOrganizer,
    private readonly logger: ILogger
  ) {}

  async execute(options: OrganizeOptions): Promise<void> {
    const config = this.configService.load(options);
    const scanner = this.scannerFactory(config);
    const organizer = this.organizerFactory(config);

    const files = await scanner.scan(targetDir);
    const operations = organizer.planOperations(files);
    const result = organizer.executeOperations(operations);

    this.displayService.logResults(result);
    
    if (config.generateManifest && !config.dryRun) {
      this.manifestService.save(result);
    }
  }
}
```

**File Size Targets:**

| File | Max Lines |
| ---- | --------- |
| `cli/index.ts` | ~50 |
| `cli/interfaces.ts` | ~60 |
| `cli/commands/*.ts` | ~60 each |
| `cli/services/*.ts` | ~50 each |

**Entry Point Update:**

```json
// package.json
{
  "bin": {
    "orderly": "./dist/cli/index.js"
  }
}
```

#### Implementation Steps

1. Create directory structure: `src/cli/commands/` and `src/cli/services/`
2. Create `src/cli/interfaces.ts` with command and service interfaces
3. Create `src/cli/types.ts` with option types and enums
4. Create service implementations in `src/cli/services/`
5. Create command implementations in `src/cli/commands/`
6. Create `src/cli/index.ts` with dependency wiring
7. Update `package.json` bin path
8. Delete old `src/cli.ts`
9. Run full test suite

#### Task Checklist

**Implementation Tasks:**

- [ ] Create directory structure: `src/cli/commands/` and `src/cli/services/`
- [ ] Create `src/cli/interfaces.ts` with command and service interfaces
- [ ] Create `src/cli/types.ts` with option types and enums
- [ ] Create `src/cli/services/config-service.ts` implementing `IConfigService`
- [ ] Create `src/cli/services/display-service.ts` implementing `IDisplayService`
- [ ] Create `src/cli/services/validation-service.ts` implementing `IValidationService`
- [ ] Create `src/cli/services/manifest-service.ts` implementing `IManifestService`
- [ ] Create `src/cli/commands/organize.ts` implementing `IOrganizeCommand`
- [ ] Create `src/cli/commands/init.ts` implementing `IInitCommand`
- [ ] Create `src/cli/commands/scan.ts` implementing `IScanCommand`
- [ ] Create `src/cli/index.ts` with dependency wiring
- [ ] Update `package.json` bin path to `./dist/cli/index.js`
- [ ] Delete old `src/cli.ts`

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] `npm run dev` (or equivalent) works correctly
- [ ] CLI commands execute without errors: `orderly organize --help`
- [ ] CLI commands execute without errors: `orderly init --help`
- [ ] CLI commands execute without errors: `orderly scan --help`

**Validation Criteria:**

- [ ] `src/cli/interfaces.ts` exports `ICommand`, `IOrganizeCommand`, `IInitCommand`, `IScanCommand`
- [ ] `src/cli/interfaces.ts` exports `IConfigService`, `IDisplayService`, `IValidationService`
- [ ] All command classes implement `ICommand<TOptions>` interface
- [ ] All service classes have corresponding interface declarations
- [ ] No file in `src/cli/` exceeds 70 lines
- [ ] `src/cli.ts` no longer exists
- [ ] `package.json` bin path updated to new location
- [ ] Command execution produces expected output

**TDD Test Specifications:**

*File: `src/cli/commands/organize.test.ts` (new)*

```typescript
import type { IOrganizeCommand, IConfigService, IDisplayService, IManifestService } from '../interfaces';
import type { OrganizeOptions } from '../types';
import { OrganizeCommand } from './organize';

describe('OrganizeCommand', () => {
  describe('IOrganizeCommand contract', () => {
    let command: IOrganizeCommand;
    let mockConfigService: jest.Mocked<IConfigService>;
    let mockDisplayService: jest.Mocked<IDisplayService>;
    let mockManifestService: jest.Mocked<IManifestService>;

    beforeEach(() => {
      mockConfigService = { load: jest.fn(), validateFormat: jest.fn(), getFilename: jest.fn() };
      mockDisplayService = { logFileSummary: jest.fn(), logResults: jest.fn(), displayScanResults: jest.fn(), showError: jest.fn() };
      mockManifestService = { save: jest.fn() };
      command = new OrganizeCommand(mockConfigService, mockDisplayService, mockManifestService, scannerFactory, organizerFactory, mockLogger);
    });

    it('should implement ICommand<OrganizeOptions> interface', () => {
      expect(command.execute).toBeDefined();
    });

    it('should load configuration via IConfigService', async () => {
      // Given: Organize options
      const options: OrganizeOptions = { dryRun: true };
      
      // When: Executing command
      await command.execute(options);
      
      // Then: Loads config through service
      expect(mockConfigService.load).toHaveBeenCalledWith(options);
    });

    it('should display results via IDisplayService', async () => {
      // When: Execution completes
      await command.execute({});
      
      // Then: Results displayed through service
      expect(mockDisplayService.logResults).toHaveBeenCalled();
    });

    it('should save manifest via IManifestService when enabled', async () => {
      // Given: Manifest generation enabled
      mockConfigService.load.mockReturnValue({ ...config, generateManifest: true, dryRun: false });
      
      // When: Executing command
      await command.execute({});
      
      // Then: Manifest saved through service
      expect(mockManifestService.save).toHaveBeenCalled();
    });

    it('should NOT save manifest when dry run', async () => {
      // Given: Dry run enabled
      mockConfigService.load.mockReturnValue({ ...config, generateManifest: true, dryRun: true });
      
      // When: Executing command
      await command.execute({ dryRun: true });
      
      // Then: Manifest NOT saved
      expect(mockManifestService.save).not.toHaveBeenCalled();
    });
  });
});
```

*File: `src/cli/services/config-service.test.ts` (new)*

```typescript
import type { IConfigService } from '../interfaces';
import { ConfigService } from './config-service';

describe('ConfigService', () => {
  describe('IConfigService contract', () => {
    let service: IConfigService;

    it('should implement IConfigService interface', () => {
      expect(service.load).toBeDefined();
      expect(service.validateFormat).toBeDefined();
      expect(service.getFilename).toBeDefined();
    });

    it('should load config with CLI options override', () => {
      // Given: Options with logLevel override
      const options = { logLevel: 'debug' };
      
      // When: Loading config
      const config = service.load(options);
      
      // Then: CLI option overrides default
      expect(config.logLevel).toBe('debug');
    });

    it('should validate supported formats', () => {
      expect(service.validateFormat('json')).toBe('json');
      expect(service.validateFormat('yaml')).toBe('yaml');
      expect(() => service.validateFormat('xml')).toThrow();
    });

    it('should return correct filename for format', () => {
      expect(service.getFilename('json')).toBe('orderly.config.json');
      expect(service.getFilename('yaml')).toBe('.orderly.yml');
    });
  });
});
```

*File: `src/cli/services/validation-service.test.ts` (new)*

```typescript
import type { IValidationService } from '../interfaces';
import { ValidationService } from './validation-service';

describe('ValidationService', () => {
  describe('IValidationService contract', () => {
    let service: IValidationService;

    it('should implement IValidationService interface', () => {
      expect(service.validateDirectory).toBeDefined();
      expect(service.validateConfigPath).toBeDefined();
    });

    it('should return resolved path for valid directory', () => {
      // Given: Valid directory path
      // When: Validating
      const result = service.validateDirectory('./test');
      
      // Then: Returns absolute path
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should throw for non-existent directory', () => {
      expect(() => service.validateDirectory('/nonexistent')).toThrow();
    });

    it('should throw for non-existent config path', () => {
      expect(() => service.validateConfigPath('/nonexistent/config.json')).toThrow();
    });
  });
});
```

---

### 4. Add Tests for Interface Implementations

#### Current State Analysis

**Problem:** `src/utils/console-output.writer.ts` implements `IOutputWriter` but lacks corresponding test file. Testing interface implementations ensures contracts are honored.

**Current Test Coverage:**

| File | Has Test | Implements Interface |
| ---- | -------- | -------------------- |
| `config-parser.ts` | ✅ | `IConfigParser` |
| `console-output.writer.ts` | ❌ | `IOutputWriter` |
| `file-categorizer.ts` | ✅ | `IFileCategorizer` |
| `file-system-utils.ts` | ✅ | `IFileSystem` |
| `guards.ts` | ✅ | (utility functions) |
| `json.parser.ts` | ❌ | (utility functions) |
| `naming.ts` | ✅ | `IFileNamer` |

#### Target State (IDD Compliant)

**Testing Strategy for Interface Implementations:**

When testing classes that implement interfaces, tests should:

1. **Verify contract compliance** - All interface methods are implemented correctly
2. **Test through the interface** - Use interface type in test declarations
3. **Mock dependencies via interfaces** - Inject mock implementations

**New File:** `src/utils/console-output.writer.test.ts`

**Test Structure (Interface-Driven):**

```typescript
import { IOutputWriter } from '../types/output';
import { ConsoleOutputWriter } from './console-output.writer';

describe('ConsoleOutputWriter', () => {
  let writer: IOutputWriter;  // Test through interface type
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    writer = new ConsoleOutputWriter();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('IOutputWriter contract', () => {
    it('should implement success method', () => {
      writer.success('test message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should implement info method', () => {
      writer.info('test message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should implement warning method', () => {
      writer.warning('test message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should implement error method', () => {
      writer.error('test message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should implement write method', () => {
      writer.write('test message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should implement newLine method', () => {
      writer.newLine();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
```

#### Implementation Steps

1. Ensure `IOutputWriter` interface exists in `src/types/output.ts`
2. Update `ConsoleOutputWriter` to explicitly implement `IOutputWriter`
3. Create `src/utils/console-output.writer.test.ts`
4. Mock `console.log` for testing output
5. Write tests for each interface method
6. Verify coverage with `npm run test:coverage`

#### Task Checklist

**Implementation Tasks:**

- [ ] Ensure `IOutputWriter` interface exists in `src/types/output.ts`
- [ ] Update `ConsoleOutputWriter` to explicitly implement `IOutputWriter`
- [ ] Create `src/utils/console-output.writer.test.ts`
- [ ] Mock `console.log` for testing output
- [ ] Write tests for `success()` method
- [ ] Write tests for `info()` method
- [ ] Write tests for `warning()` method
- [ ] Write tests for `error()` method
- [ ] Write tests for `write()` method
- [ ] Write tests for `newLine()` method
- [ ] Write tests for `table()` method

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] `npm run test:coverage` shows coverage > 80% for `console-output.writer.ts`

**Validation Criteria:**

- [ ] `ConsoleOutputWriter` class declaration includes `implements IOutputWriter`
- [ ] `src/utils/console-output.writer.test.ts` file exists
- [ ] Test file declares variable with `IOutputWriter` type: `let writer: IOutputWriter`
- [ ] Tests cover all interface methods (success, info, warning, error, write, newLine, table)
- [ ] Tests verify actual console output behavior
- [ ] Coverage report shows 80%+ line coverage

**TDD Test Specifications:**

*File: `src/utils/console-output.writer.test.ts` (new)*

```typescript
import type { IOutputWriter } from '../types/output';
import { ConsoleOutputWriter } from './console-output.writer';

describe('ConsoleOutputWriter', () => {
  let writer: IOutputWriter;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    writer = new ConsoleOutputWriter();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('IOutputWriter contract compliance', () => {
    it('should implement all IOutputWriter methods', () => {
      // Then: All interface methods exist
      expect(writer.success).toBeDefined();
      expect(writer.info).toBeDefined();
      expect(writer.warning).toBeDefined();
      expect(writer.error).toBeDefined();
      expect(writer.write).toBeDefined();
      expect(writer.newLine).toBeDefined();
      expect(writer.table).toBeDefined();
    });
  });

  describe('success()', () => {
    it('should output success message with green checkmark', () => {
      // When: Calling success
      writer.success('Operation completed');
      
      // Then: Console called with formatted success message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Operation completed')
      );
    });

    it('should include visual success indicator', () => {
      writer.success('Done');
      // Then: Output contains success indicator (✓ or similar)
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toMatch(/[✓✔]|success/i);
    });
  });

  describe('info()', () => {
    it('should output informational message', () => {
      writer.info('Processing files');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing files')
      );
    });
  });

  describe('warning()', () => {
    it('should output warning message with visual indicator', () => {
      writer.warning('File already exists');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('File already exists')
      );
    });
  });

  describe('error()', () => {
    it('should output error message with red indicator', () => {
      writer.error('Operation failed');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Operation failed')
      );
    });
  });

  describe('write()', () => {
    it('should output plain message without formatting', () => {
      writer.write('Plain text');
      expect(consoleSpy).toHaveBeenCalledWith('Plain text');
    });
  });

  describe('newLine()', () => {
    it('should output empty line', () => {
      writer.newLine();
      expect(consoleSpy).toHaveBeenCalledWith();
    });
  });

  describe('table()', () => {
    it('should render data as formatted table', () => {
      // Given: Array of data objects
      const data = [
        { name: 'file1.txt', size: 100 },
        { name: 'file2.txt', size: 200 }
      ];
      
      // When: Rendering table
      writer.table(data);
      
      // Then: Output includes tabular format
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should use specified columns when provided', () => {
      const data = [{ a: 1, b: 2, c: 3 }];
      
      writer.table(data, ['a', 'b']);
      
      // Then: Only specified columns rendered
      const output = consoleSpy.mock.calls.join('');
      expect(output).not.toContain('c');
    });
  });
});
```

---

### 5. Create Errors Module with Error Interfaces

#### Current State Analysis

**Problem:** Error handling uses generic `Error` class throughout, making error categorization and type-safe error handling difficult.

**Current Error Patterns (Anti-Pattern):**

```typescript
// config-loader.ts - Generic error, no type safety
throw new Error(`Config file not found: ${configPath}`);

// operation-executor.ts - Cannot programmatically identify error type
throw new Error(`Target file already exists: ${operation.newPath}`);

// config-parser.ts - No error code for handling
throw new Error(`Unsupported config file format: ${ext}`);
```

#### Target State (IDD Compliant)

**New File Structure:**

```
src/errors/
├── index.ts
├── interfaces.ts           # Error interfaces
├── base-error.ts           # Abstract base implementing interface
├── config-error.ts         # Config-related errors
├── file-operation-error.ts # File operation errors
└── validation-error.ts     # Validation errors
```

**New `src/errors/interfaces.ts`:**

```typescript
/**
 * Base interface for all Orderly errors.
 * Enables type-safe error handling and categorization.
 */
export interface IOrderlyError extends Error {
  /** Unique error code for programmatic handling */
  readonly code: string;
  
  /** Error category for grouping related errors */
  readonly category: ErrorCategory;
  
  /** Optional context data for debugging */
  readonly context?: Record<string, unknown>;
}

/**
 * Error categories for grouping and handling.
 */
export enum ErrorCategory {
  CONFIG = 'config',
  FILE_OPERATION = 'file-operation',
  VALIDATION = 'validation',
  SYSTEM = 'system'
}

/**
 * Error codes for all possible errors.
 */
export enum ErrorCode {
  // Config errors
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_PARSE_ERROR = 'CONFIG_PARSE_ERROR',
  UNSUPPORTED_CONFIG_FORMAT = 'UNSUPPORTED_CONFIG_FORMAT',
  
  // File operation errors
  FILE_EXISTS = 'FILE_EXISTS',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // Validation errors
  INVALID_PATH = 'INVALID_PATH',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_CONFIG = 'INVALID_CONFIG'
}
```

**New `src/errors/base-error.ts`:**

```typescript
import { IOrderlyError, ErrorCategory, ErrorCode } from './interfaces';

/**
 * Abstract base class for all Orderly errors.
 * Implements IOrderlyError interface.
 */
export abstract class OrderlyError extends Error implements IOrderlyError {
  abstract readonly code: ErrorCode;
  abstract readonly category: ErrorCategory;
  readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    
    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Creates a JSON representation for logging/serialization.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      context: this.context
    };
  }
}
```

**New `src/errors/config-error.ts`:**

```typescript
import { OrderlyError } from './base-error';
import { ErrorCategory, ErrorCode } from './interfaces';

export class ConfigNotFoundError extends OrderlyError {
  readonly code = ErrorCode.CONFIG_NOT_FOUND;
  readonly category = ErrorCategory.CONFIG;

  constructor(path: string) {
    super(`Config file not found: ${path}`, { path });
  }
}

export class UnsupportedConfigFormatError extends OrderlyError {
  readonly code = ErrorCode.UNSUPPORTED_CONFIG_FORMAT;
  readonly category = ErrorCategory.CONFIG;

  constructor(format: string) {
    super(`Unsupported config file format: ${format}`, { format });
  }
}

export class ConfigParseError extends OrderlyError {
  readonly code = ErrorCode.CONFIG_PARSE_ERROR;
  readonly category = ErrorCategory.CONFIG;

  constructor(path: string, cause: string) {
    super(`Failed to parse config file: ${path}`, { path, cause });
  }
}
```

**New `src/errors/file-operation-error.ts`:**

```typescript
import { OrderlyError } from './base-error';
import { ErrorCategory, ErrorCode } from './interfaces';

export class FileExistsError extends OrderlyError {
  readonly code = ErrorCode.FILE_EXISTS;
  readonly category = ErrorCategory.FILE_OPERATION;

  constructor(path: string) {
    super(`Target file already exists: ${path}`, { path });
  }
}

export class DirectoryNotFoundError extends OrderlyError {
  readonly code = ErrorCode.DIRECTORY_NOT_FOUND;
  readonly category = ErrorCategory.FILE_OPERATION;

  constructor(path: string) {
    super(`Directory does not exist: ${path}`, { path });
  }
}

export class PermissionDeniedError extends OrderlyError {
  readonly code = ErrorCode.PERMISSION_DENIED;
  readonly category = ErrorCategory.FILE_OPERATION;

  constructor(path: string, operation: string) {
    super(`Permission denied: ${operation} on ${path}`, { path, operation });
  }
}
```

**Type-Safe Error Handling:**

```typescript
import { IOrderlyError, ErrorCategory, ErrorCode } from './errors/interfaces';
import { ConfigNotFoundError, FileExistsError } from './errors';

// Type-safe error handling
function handleError(error: unknown): void {
  if (isOrderlyError(error)) {
    switch (error.category) {
      case ErrorCategory.CONFIG:
        console.error(`Configuration error [${error.code}]: ${error.message}`);
        break;
      case ErrorCategory.FILE_OPERATION:
        console.error(`File operation error [${error.code}]: ${error.message}`);
        break;
      default:
        console.error(`Error [${error.code}]: ${error.message}`);
    }
  } else {
    console.error('Unknown error:', error);
  }
}

// Type guard for IOrderlyError
function isOrderlyError(error: unknown): error is IOrderlyError {
  return (
    error instanceof Error &&
    'code' in error &&
    'category' in error
  );
}
```

#### Implementation Steps

1. Create `src/errors/` directory
2. Create `interfaces.ts` with `IOrderlyError`, `ErrorCategory`, `ErrorCode`
3. Create `base-error.ts` implementing `IOrderlyError`
4. Create `config-error.ts` with config-related errors
5. Create `file-operation-error.ts` with file operation errors
6. Create `validation-error.ts` with validation errors
7. Create `index.ts` barrel export
8. Update `src/index.ts` to export errors and interfaces
9. Add type guard `isOrderlyError()` to guards module
10. Migrate existing throw statements to use typed errors

#### Task Checklist

**Implementation Tasks:**

- [ ] Create `src/errors/` directory
- [ ] Create `src/errors/interfaces.ts` with `IOrderlyError`, `ErrorCategory`, `ErrorCode`
- [ ] Create `src/errors/base-error.ts` implementing `IOrderlyError`
- [ ] Create `src/errors/config-error.ts` with `ConfigNotFoundError`, `UnsupportedConfigFormatError`, `ConfigParseError`
- [ ] Create `src/errors/file-operation-error.ts` with `FileExistsError`, `DirectoryNotFoundError`, `PermissionDeniedError`
- [ ] Create `src/errors/validation-error.ts` with validation error classes
- [ ] Create `src/errors/index.ts` barrel export
- [ ] Update `src/index.ts` to export errors and interfaces
- [ ] Add type guard `isOrderlyError()` to guards module
- [ ] Migrate `config-loader.ts` to use `ConfigNotFoundError`
- [ ] Migrate `operation-executor.ts` to use `FileExistsError`
- [ ] Migrate `config-parser.ts` to use `UnsupportedConfigFormatError`

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] `npm run lint` shows no new warnings
- [ ] TypeScript can infer error types correctly

**Validation Criteria:**

- [ ] `src/errors/interfaces.ts` exists and exports `IOrderlyError`, `ErrorCategory`, `ErrorCode`
- [ ] `OrderlyError` abstract class implements `IOrderlyError`
- [ ] All concrete error classes extend `OrderlyError`
- [ ] All error classes have readonly `code` and `category` properties
- [ ] Errors are exported from `src/index.ts`
- [ ] Type guard `isOrderlyError()` correctly identifies `IOrderlyError` instances
- [ ] At least 3 throw statements use new typed error classes
- [ ] Error `toJSON()` method produces valid JSON representation

**TDD Test Specifications:**

*File: `src/errors/base-error.test.ts` (new)*

```typescript
import type { IOrderlyError } from './interfaces';
import { OrderlyError, ErrorCategory, ErrorCode } from './interfaces';

// Concrete implementation for testing abstract class
class TestError extends OrderlyError {
  readonly code = ErrorCode.FILE_NOT_FOUND;
  readonly category = ErrorCategory.FILE_OPERATION;
}

describe('OrderlyError', () => {
  describe('IOrderlyError contract', () => {
    it('should implement IOrderlyError interface', () => {
      const error = new TestError('Test message');
      
      // Then: Has all IOrderlyError properties
      expect(error.code).toBe(ErrorCode.FILE_NOT_FOUND);
      expect(error.category).toBe(ErrorCategory.FILE_OPERATION);
      expect(error.message).toBe('Test message');
    });

    it('should extend Error class', () => {
      const error = new TestError('Test');
      expect(error instanceof Error).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new TestError('Test');
      expect(error.stack).toBeDefined();
    });
  });

  describe('context property', () => {
    it('should store optional context data', () => {
      const error = new TestError('Test', { path: '/test/file.txt' });
      expect(error.context).toEqual({ path: '/test/file.txt' });
    });

    it('should be undefined when not provided', () => {
      const error = new TestError('Test');
      expect(error.context).toBeUndefined();
    });
  });

  describe('toJSON()', () => {
    it('should serialize to JSON with all properties', () => {
      const error = new TestError('File not found', { path: '/test' });
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'TestError',
        code: ErrorCode.FILE_NOT_FOUND,
        category: ErrorCategory.FILE_OPERATION,
        message: 'File not found',
        context: { path: '/test' }
      });
    });

    it('should produce valid JSON string', () => {
      const error = new TestError('Test');
      expect(() => JSON.stringify(error.toJSON())).not.toThrow();
    });
  });
});
```

*File: `src/errors/config-error.test.ts` (new)*

```typescript
import { ConfigNotFoundError, UnsupportedConfigFormatError, ConfigParseError } from './config-error';
import { ErrorCategory, ErrorCode } from './interfaces';

describe('Config Errors', () => {
  describe('ConfigNotFoundError', () => {
    it('should have CONFIG_NOT_FOUND code', () => {
      const error = new ConfigNotFoundError('/path/to/config.json');
      expect(error.code).toBe(ErrorCode.CONFIG_NOT_FOUND);
    });

    it('should have CONFIG category', () => {
      const error = new ConfigNotFoundError('/path');
      expect(error.category).toBe(ErrorCategory.CONFIG);
    });

    it('should include path in message', () => {
      const error = new ConfigNotFoundError('/path/to/config.json');
      expect(error.message).toContain('/path/to/config.json');
    });

    it('should store path in context', () => {
      const error = new ConfigNotFoundError('/path/to/config.json');
      expect(error.context?.path).toBe('/path/to/config.json');
    });
  });

  describe('UnsupportedConfigFormatError', () => {
    it('should have UNSUPPORTED_CONFIG_FORMAT code', () => {
      const error = new UnsupportedConfigFormatError('.xml');
      expect(error.code).toBe(ErrorCode.UNSUPPORTED_CONFIG_FORMAT);
    });

    it('should include format in message', () => {
      const error = new UnsupportedConfigFormatError('.xml');
      expect(error.message).toContain('.xml');
    });
  });

  describe('ConfigParseError', () => {
    it('should have CONFIG_PARSE_ERROR code', () => {
      const error = new ConfigParseError('/config.json', 'Invalid JSON');
      expect(error.code).toBe(ErrorCode.CONFIG_PARSE_ERROR);
    });

    it('should store path and cause in context', () => {
      const error = new ConfigParseError('/config.json', 'Syntax error');
      expect(error.context?.path).toBe('/config.json');
      expect(error.context?.cause).toBe('Syntax error');
    });
  });
});
```

*File: `src/utils/guards.test.ts` (update existing)*

```typescript
import { isOrderlyError } from './guards';
import { ConfigNotFoundError } from '../errors';

describe('isOrderlyError type guard', () => {
  it('should return true for OrderlyError instances', () => {
    const error = new ConfigNotFoundError('/path');
    expect(isOrderlyError(error)).toBe(true);
  });

  it('should return false for standard Error', () => {
    const error = new Error('Standard error');
    expect(isOrderlyError(error)).toBe(false);
  });

  it('should return false for non-Error objects', () => {
    expect(isOrderlyError({ code: 'TEST', category: 'test' })).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isOrderlyError(null)).toBe(false);
    expect(isOrderlyError(undefined)).toBe(false);
  });

  it('should enable type narrowing in conditionals', () => {
    const error: unknown = new ConfigNotFoundError('/path');
    
    if (isOrderlyError(error)) {
      // TypeScript should recognize error.code and error.category
      expect(error.code).toBeDefined();
      expect(error.category).toBeDefined();
    }
  });
});
```

---

### 6. Create Constants Module with Type-Safe Definitions

#### Current State Analysis

**Problem:** Default values and constants are scattered across multiple files without type safety.

**Current Locations:**

- `DEFAULT_CONFIG` in `src/config/types.ts`
- Config file names in `src/config/config-loader.ts`
- File extension lists embedded in `DEFAULT_CONFIG`

#### Target State (IDD Compliant)

**New File Structure:**

```
src/constants/
├── index.ts
├── types.ts              # Type definitions for constants
├── defaults.ts           # Default configuration values
└── file-extensions.ts    # File extension constants
```

**New `src/constants/types.ts`:**

```typescript
/**
 * Readonly type for immutable constant arrays.
 */
export type ReadonlyExtensionList = readonly string[];

/**
 * File category definition interface.
 */
export interface IFileCategory {
  readonly name: string;
  readonly extensions: ReadonlyExtensionList;
  readonly targetFolder: string;
}

/**
 * All supported file categories.
 */
export type FileCategoryName = 
  | 'images' 
  | 'documents' 
  | 'videos' 
  | 'audio' 
  | 'archives' 
  | 'code';
```

**New `src/constants/file-extensions.ts`:**

```typescript
import { ReadonlyExtensionList, IFileCategory } from './types';

export const IMAGE_EXTENSIONS: ReadonlyExtensionList = [
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'
] as const;

export const DOCUMENT_EXTENSIONS: ReadonlyExtensionList = [
  '.pdf', '.doc', '.docx', '.txt', '.md', '.odt', '.rtf'
] as const;

export const VIDEO_EXTENSIONS: ReadonlyExtensionList = [
  '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'
] as const;

export const AUDIO_EXTENSIONS: ReadonlyExtensionList = [
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'
] as const;

export const ARCHIVE_EXTENSIONS: ReadonlyExtensionList = [
  '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz'
] as const;

export const CODE_EXTENSIONS: ReadonlyExtensionList = [
  '.js', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.go', '.rs', '.php', '.rb'
] as const;

/**
 * Default file categories with type safety.
 */
export const DEFAULT_CATEGORIES: readonly IFileCategory[] = [
  { name: 'images', extensions: IMAGE_EXTENSIONS, targetFolder: 'images' },
  { name: 'documents', extensions: DOCUMENT_EXTENSIONS, targetFolder: 'documents' },
  { name: 'videos', extensions: VIDEO_EXTENSIONS, targetFolder: 'videos' },
  { name: 'audio', extensions: AUDIO_EXTENSIONS, targetFolder: 'audio' },
  { name: 'archives', extensions: ARCHIVE_EXTENSIONS, targetFolder: 'archives' },
  { name: 'code', extensions: CODE_EXTENSIONS, targetFolder: 'code' }
] as const;
```

**New `src/constants/defaults.ts`:**

```typescript
/**
 * Configuration file names in order of precedence.
 */
export const CONFIG_FILE_NAMES = [
  '.orderly.yml', 
  '.orderly.yaml', 
  'orderly.config.json'
] as const;

export type ConfigFileName = typeof CONFIG_FILE_NAMES[number];

/**
 * Default file paths.
 */
export const DEFAULT_LOG_FILE = '.orderly/orderly.log' as const;
export const DEFAULT_MANIFEST_DIR = '.orderly' as const;
export const DEFAULT_MANIFEST_FILE = 'manifest.json' as const;
export const DEFAULT_MANIFEST_MD = 'manifest.md' as const;
```

#### Implementation Steps

1. Create `src/constants/` directory
2. Create `types.ts` with type definitions
3. Create `file-extensions.ts` with extension constants
4. Create `defaults.ts` with default values
5. Create `index.ts` barrel export
6. Update `src/config/types.ts` to use constants
7. Update `src/config/config-loader.ts` to use `CONFIG_FILE_NAMES`
8. Update CLI files to use path constants

#### Task Checklist

**Implementation Tasks:**

- [ ] Create `src/constants/` directory
- [ ] Create `src/constants/types.ts` with `ReadonlyExtensionList`, `IFileCategory`, `FileCategoryName`
- [ ] Create `src/constants/file-extensions.ts` with extension constants
- [ ] Create `src/constants/defaults.ts` with default values
- [ ] Create `src/constants/index.ts` barrel export
- [ ] Update `src/config/types.ts` to import categories from constants
- [ ] Update `src/config/config-loader.ts` to use `CONFIG_FILE_NAMES`
- [ ] Update CLI files to use path constants

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] TypeScript infers literal types from `as const` arrays

**Validation Criteria:**

- [ ] `src/constants/types.ts` exists and exports type definitions
- [ ] `src/constants/file-extensions.ts` exists and exports extension arrays
- [ ] `src/constants/defaults.ts` exists and exports default values
- [ ] All constant arrays use `as const` for type narrowing
- [ ] `IMAGE_EXTENSIONS` constant is defined and exported
- [ ] `CONFIG_FILE_NAMES` constant is defined and exported
- [ ] Constants are imported and used in at least 2 source files
- [ ] No magic strings remain in `config-loader.ts` for config file names

**TDD Test Specifications:**

*File: `src/constants/file-extensions.test.ts` (new)*

```typescript
import {
  IMAGE_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
  ARCHIVE_EXTENSIONS,
  CODE_EXTENSIONS,
  DEFAULT_CATEGORIES
} from './file-extensions';

describe('File Extension Constants', () => {
  describe('IMAGE_EXTENSIONS', () => {
    it('should be a readonly array', () => {
      // TypeScript compile-time check - array should be readonly
      expect(Array.isArray(IMAGE_EXTENSIONS)).toBe(true);
    });

    it('should contain common image extensions', () => {
      expect(IMAGE_EXTENSIONS).toContain('.jpg');
      expect(IMAGE_EXTENSIONS).toContain('.png');
      expect(IMAGE_EXTENSIONS).toContain('.gif');
      expect(IMAGE_EXTENSIONS).toContain('.svg');
    });

    it('should have extensions starting with dot', () => {
      IMAGE_EXTENSIONS.forEach(ext => {
        expect(ext.startsWith('.')).toBe(true);
      });
    });

    it('should be lowercase', () => {
      IMAGE_EXTENSIONS.forEach(ext => {
        expect(ext).toBe(ext.toLowerCase());
      });
    });
  });

  describe('DOCUMENT_EXTENSIONS', () => {
    it('should contain common document extensions', () => {
      expect(DOCUMENT_EXTENSIONS).toContain('.pdf');
      expect(DOCUMENT_EXTENSIONS).toContain('.doc');
      expect(DOCUMENT_EXTENSIONS).toContain('.txt');
      expect(DOCUMENT_EXTENSIONS).toContain('.md');
    });
  });

  describe('VIDEO_EXTENSIONS', () => {
    it('should contain common video extensions', () => {
      expect(VIDEO_EXTENSIONS).toContain('.mp4');
      expect(VIDEO_EXTENSIONS).toContain('.avi');
      expect(VIDEO_EXTENSIONS).toContain('.mkv');
    });
  });

  describe('AUDIO_EXTENSIONS', () => {
    it('should contain common audio extensions', () => {
      expect(AUDIO_EXTENSIONS).toContain('.mp3');
      expect(AUDIO_EXTENSIONS).toContain('.wav');
      expect(AUDIO_EXTENSIONS).toContain('.flac');
    });
  });

  describe('ARCHIVE_EXTENSIONS', () => {
    it('should contain common archive extensions', () => {
      expect(ARCHIVE_EXTENSIONS).toContain('.zip');
      expect(ARCHIVE_EXTENSIONS).toContain('.tar');
      expect(ARCHIVE_EXTENSIONS).toContain('.gz');
    });
  });

  describe('CODE_EXTENSIONS', () => {
    it('should contain common programming language extensions', () => {
      expect(CODE_EXTENSIONS).toContain('.js');
      expect(CODE_EXTENSIONS).toContain('.ts');
      expect(CODE_EXTENSIONS).toContain('.py');
    });
  });

  describe('DEFAULT_CATEGORIES', () => {
    it('should be an array of IFileCategory objects', () => {
      expect(Array.isArray(DEFAULT_CATEGORIES)).toBe(true);
      DEFAULT_CATEGORIES.forEach(category => {
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('extensions');
        expect(category).toHaveProperty('targetFolder');
      });
    });

    it('should have 6 default categories', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(6);
    });

    it('should reference extension constants', () => {
      const imagesCategory = DEFAULT_CATEGORIES.find(c => c.name === 'images');
      expect(imagesCategory?.extensions).toBe(IMAGE_EXTENSIONS);
    });
  });
});
```

*File: `src/constants/defaults.test.ts` (new)*

```typescript
import { CONFIG_FILE_NAMES, DEFAULT_LOG_FILE, DEFAULT_MANIFEST_DIR } from './defaults';

describe('Default Constants', () => {
  describe('CONFIG_FILE_NAMES', () => {
    it('should be a readonly tuple', () => {
      expect(Array.isArray(CONFIG_FILE_NAMES)).toBe(true);
    });

    it('should contain orderly config file names', () => {
      expect(CONFIG_FILE_NAMES).toContain('.orderly.yml');
      expect(CONFIG_FILE_NAMES).toContain('.orderly.yaml');
      expect(CONFIG_FILE_NAMES).toContain('orderly.config.json');
    });

    it('should have YAML files before JSON for precedence', () => {
      const yamlIndex = CONFIG_FILE_NAMES.indexOf('.orderly.yml');
      const jsonIndex = CONFIG_FILE_NAMES.indexOf('orderly.config.json');
      expect(yamlIndex).toBeLessThan(jsonIndex);
    });
  });

  describe('DEFAULT_LOG_FILE', () => {
    it('should be a string path', () => {
      expect(typeof DEFAULT_LOG_FILE).toBe('string');
    });

    it('should be in .orderly directory', () => {
      expect(DEFAULT_LOG_FILE).toContain('.orderly');
    });
  });

  describe('DEFAULT_MANIFEST_DIR', () => {
    it('should be .orderly directory', () => {
      expect(DEFAULT_MANIFEST_DIR).toBe('.orderly');
    });
  });
});
```

---

### 7. Fix Utils Barrel Export and Add Interface Re-exports

#### Current State Analysis

**Problem:** `src/utils/index.ts` uses `.js` extensions inconsistently, and doesn't re-export interfaces.

**Current Code:**

```typescript
export * from './config-parser.js';
export * from './console-output.writer.js';
export * from './file-categorizer.js';
export * from './file-system-utils.js';
export * from './guards.js';
export * from './json.parser.js';
export * from './naming.js';
```

#### Target State (IDD Compliant)

**Updated `src/utils/index.ts`:**

```typescript
// Interface exports (contracts first)
export type { IFileSystem, IFileStats } from '../types/file-system';
export type { IFileNamer } from '../types/naming';
export type { IFileCategorizer } from '../types/categorizer';

// Implementation exports
export * from './config-parser';
export * from './console-output.writer';
export * from './file-categorizer';
export * from './file-system-utils';
export * from './guards';
export * from './json.parser';
export * from './naming';
```

**IDD Best Practice:** Export interfaces before implementations to emphasize the contract-first approach.

#### Implementation Steps

1. Update `src/utils/index.ts` to remove `.js` extensions
2. Add interface type exports at the top
3. Verify build succeeds
4. Run tests

#### Task Checklist

**Implementation Tasks:**

- [ ] Update `src/utils/index.ts` to remove `.js` extensions from exports
- [ ] Add interface type exports at the top of barrel file
- [ ] Export `IFileSystem` and `IFileStats` types
- [ ] Export `IFileNamer` type (if defined)
- [ ] Export `IFileCategorizer` type (if defined)
- [ ] Verify import resolution works correctly

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] No import resolution errors in IDE
- [ ] Module resolution works in both development and production builds

**Validation Criteria:**

- [ ] `src/utils/index.ts` contains no `.js` extensions in export paths
- [ ] Interface type exports appear before implementation exports
- [ ] All existing imports from `src/utils` continue to resolve
- [ ] Consistent import style across codebase (no mixed `.js`/`.ts` extensions)
- [ ] Type-only exports use `export type { }` syntax

**TDD Test Specifications:**

*File: `src/utils/index.test.ts` (new)*

```typescript
import type { IFileSystem, IFileStats } from '../types/file-system';
import {
  ConfigParser,
  ConsoleOutputWriter,
  FileCategorizer,
  FileSystemUtils,
  JsonParser,
  isOrderlyError
} from './index';

describe('Utils Barrel Export', () => {
  describe('Implementation exports', () => {
    it('should export ConfigParser class', () => {
      expect(ConfigParser).toBeDefined();
      expect(typeof ConfigParser.parse).toBe('function');
    });

    it('should export ConsoleOutputWriter class', () => {
      expect(ConsoleOutputWriter).toBeDefined();
      expect(typeof ConsoleOutputWriter).toBe('function');
    });

    it('should export FileCategorizer class', () => {
      expect(FileCategorizer).toBeDefined();
      expect(typeof FileCategorizer.categorize).toBe('function');
    });

    it('should export FileSystemUtils class', () => {
      expect(FileSystemUtils).toBeDefined();
      expect(typeof FileSystemUtils.existsSync).toBe('function');
    });

    it('should export isOrderlyError guard function', () => {
      expect(isOrderlyError).toBeDefined();
      expect(typeof isOrderlyError).toBe('function');
    });

    it('should export JsonParser class', () => {
      expect(JsonParser).toBeDefined();
      expect(typeof JsonParser.parse).toBe('function');
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain all expected exports', () => {
      // Given: Known exports from previous version
      const expectedExports = [
        ConfigParser,
        ConsoleOutputWriter,
        FileCategorizer,
        FileSystemUtils
      ];
      
      // Then: All expected exports are defined
      expectedExports.forEach(exportedItem => {
        expect(exportedItem).toBeDefined();
      });
    });
  });

  describe('Type exports (compile-time verification)', () => {
    it('should allow IFileSystem type usage', () => {
      // This test verifies compile-time type availability
      // The type import at module level ensures IFileSystem is exported
      const mockFileSystem: IFileSystem = {
        existsSync: jest.fn(),
        readFileSync: jest.fn(),
        writeFileSync: jest.fn(),
        appendFileSync: jest.fn(),
        mkdirSync: jest.fn(),
        renameSync: jest.fn(),
        statSync: jest.fn()
      };
      
      expect(mockFileSystem).toBeDefined();
    });

    it('should allow IFileStats type usage', () => {
      const mockStats: IFileStats = {
        isFile: () => true,
        isDirectory: () => false,
        size: 1024,
        mtime: new Date()
      };
      
      expect(mockStats.isFile()).toBe(true);
    });
  });
});
```

---

## Feature: De-duplication Module

The de-duplication feature is a new capability that will be built using the IDD architecture established by the improvement areas above. This section details how dedupe integrates with and benefits from the foundational improvements.

### Feature Overview

**Purpose:** Detect and optionally remove duplicate files based on configurable strategies before move/rename operations are executed.

**Key Behaviors:**

- Dedupe operates on scanned files before `OperationPlanner` runs
- Supports multiple strategies: filename, size, SHA-256, image dimensions, EXIF, file properties
- Configurable actions: `skip`, `report`, or `replace` duplicates
- Backward compatible: disabled by default, existing behavior unchanged

### IDD Benefits for Dedupe

The dedupe feature directly benefits from improvements #1-#7:

| Improvement | Benefit to Dedupe |
| ----------- | ----------------- |
| #2 Extract Interfaces | Dedupe interfaces extend the same patterns (`IDedupeService`, `IDedupeStrategy`) |
| #3 CLI Refactoring | New `dedupe` command follows `ICommand` interface pattern |
| #5 Errors Module | Dedupe errors extend `IOrderlyError` (e.g., `HashingError`, `MetadataReadError`) |
| #6 Constants Module | Reuses `IMAGE_EXTENSIONS` for dimension strategy support detection |
| #7 Utils Exports | Dedupe utilities follow same barrel export pattern |

### Dedupe Interface Architecture

**Location:** `src/dedupe/interfaces.ts`

```typescript
import { IScannedFile } from '../scanner/interfaces';

/**
 * Main dedupe orchestration service.
 * Coordinates strategies and applies actions.
 */
export interface IDedupeService {
  /**
   * Finds duplicate files using configured strategies.
   * @param files - Scanned files to check for duplicates
   * @returns Grouped duplicates with metadata
   */
  findDuplicates(files: IScannedFile[]): Promise<IDedupeResult>;

  /**
   * Applies the configured action to duplicate groups.
   * @param result - Duplicate detection result
   * @param action - Action to apply (skip, report, replace)
   * @returns Outcome with affected files
   */
  applyAction(result: IDedupeResult, action: DedupeAction): Promise<IDedupeOutcome>;
}

/**
 * Strategy interface for duplicate detection.
 * Each strategy produces a comparable key for grouping.
 * Follows Strategy pattern for extensibility.
 */
export interface IDedupeStrategy {
  /** Unique strategy identifier */
  readonly name: string;

  /** Priority for execution order (lower = earlier) */
  readonly priority: number;

  /**
   * Checks if this strategy can process the file.
   * @param file - File to check
   * @returns True if strategy applies to this file type
   */
  supports(file: IScannedFile): boolean;

  /**
   * Generates a comparable key for the file.
   * Files with matching keys are potential duplicates.
   * @param file - File to generate key for
   * @returns Key string or null if unable to process
   */
  getKey(file: IScannedFile): Promise<string | null>;
}

/**
 * File content hashing interface.
 * Abstracted to allow different hashing implementations.
 */
export interface IDedupeHasher {
  /**
   * Computes SHA-256 hash of file contents.
   * @param filePath - Absolute path to file
   * @returns Hex-encoded hash string
   */
  sha256(filePath: string): Promise<string>;
}

/**
 * Metadata extraction interface.
 * Abstracted to support different metadata libraries.
 */
export interface IMetadataExtractor {
  /**
   * Extracts image dimensions from supported formats.
   */
  extractDimensions(filePath: string): Promise<IImageDimensions | null>;

  /**
   * Extracts EXIF data from images.
   */
  extractExif(filePath: string): Promise<Record<string, string> | null>;

  /**
   * Extracts file system properties (timestamps, owner).
   */
  extractProperties(filePath: string): Promise<IFileProperties | null>;

  /**
   * Extracts platform-specific file attributes.
   */
  extractAttributes(filePath: string): Promise<IFileAttributes | null>;
}

/**
 * Report generation interface.
 */
export interface IDedupeReportWriter {
  /**
   * Writes dedupe results to a report file.
   */
  write(result: IDedupeResult, outputPath: string): Promise<void>;

  /**
   * Writes markdown-formatted report.
   */
  writeMarkdown(result: IDedupeResult, outputPath: string): Promise<void>;
}
```

### Dedupe Type Definitions

**Location:** `src/dedupe/types.ts`

```typescript
import { IScannedFile } from '../scanner/interfaces';

/**
 * Actions that can be taken on detected duplicates.
 */
export enum DedupeAction {
  /** Remove duplicates from operation queue */
  SKIP = 'skip',
  /** Generate report without modifying operations */
  REPORT = 'report',
  /** Keep primary, schedule duplicates for deletion */
  REPLACE = 'replace'
}

/**
 * Strategy composition mode.
 */
export enum DedupeMode {
  /** All enabled strategies must match (AND) */
  ALL = 'all',
  /** Any enabled strategy match counts (OR) */
  ANY = 'any'
}

/**
 * Strategy-specific configuration options.
 */
export interface IDedupeStrategyConfig {
  mode: DedupeMode;
  name?: { caseSensitive: boolean; ignoreExtension: boolean };
  size?: boolean;
  imageDimensions?: boolean;
  sha256?: boolean;
  fileProperties?: boolean;
  fileAttributes?: boolean;
  exif?: boolean;
}

/**
 * Full dedupe configuration.
 */
export interface IDedupeConfig {
  enabled: boolean;
  recursive: boolean;
  strategy: IDedupeStrategyConfig;
  action: DedupeAction;
}

/**
 * Image dimension metadata.
 */
export interface IImageDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * File system properties.
 */
export interface IFileProperties {
  readonly createdAt?: Date;
  readonly modifiedAt?: Date;
  readonly owner?: string;
  readonly mimeType?: string;
}

/**
 * Platform-specific file attributes.
 */
export interface IFileAttributes {
  readonly readonly?: boolean;
  readonly hidden?: boolean;
  readonly system?: boolean;
}

/**
 * A file paired with its computed dedupe key.
 */
export interface IDedupeCandidate {
  readonly file: IScannedFile;
  readonly key: string;
  readonly strategy: string;
}

/**
 * A group of files sharing the same dedupe key.
 */
export interface IDuplicateGroup {
  readonly key: string;
  readonly strategy: string;
  readonly files: readonly IScannedFile[];
  readonly primary?: IScannedFile;
}

/**
 * Result of duplicate detection.
 */
export interface IDedupeResult {
  readonly groups: readonly IDuplicateGroup[];
  readonly totalFiles: number;
  readonly totalDuplicates: number;
  readonly strategiesUsed: readonly string[];
}

/**
 * Outcome after applying dedupe action.
 */
export interface IDedupeOutcome {
  readonly action: DedupeAction;
  readonly skipped: readonly IScannedFile[];
  readonly replaced: readonly IScannedFile[];
  readonly reported: readonly IDuplicateGroup[];
  readonly errors: readonly IDedupeError[];
}

/**
 * Dedupe-specific error information.
 */
export interface IDedupeError {
  readonly file: string;
  readonly strategy: string;
  readonly error: string;
}
```

### Strategy Implementations

Each strategy implements `IDedupeStrategy`, enabling substitution and testing:

**Location:** `src/dedupe/strategies/`

```typescript
// name-strategy.ts
export class NameStrategy implements IDedupeStrategy {
  readonly name = 'name';
  readonly priority = 10;

  constructor(private readonly config: { caseSensitive: boolean; ignoreExtension: boolean }) {}

  supports(_file: IScannedFile): boolean {
    return true; // All files have names
  }

  async getKey(file: IScannedFile): Promise<string> {
    let name = this.config.ignoreExtension
      ? path.basename(file.filename, file.extension)
      : file.filename;
    return this.config.caseSensitive ? name : name.toLowerCase();
  }
}

// size-strategy.ts
export class SizeStrategy implements IDedupeStrategy {
  readonly name = 'size';
  readonly priority = 5; // Run early as prefilter

  constructor(private readonly fileSystem: IFileSystem) {}

  supports(_file: IScannedFile): boolean {
    return true;
  }

  async getKey(file: IScannedFile): Promise<string> {
    return String(file.size);
  }
}

// sha256-strategy.ts
export class Sha256Strategy implements IDedupeStrategy {
  readonly name = 'sha256';
  readonly priority = 100; // Run last (expensive)

  constructor(private readonly hasher: IDedupeHasher) {}

  supports(_file: IScannedFile): boolean {
    return true;
  }

  async getKey(file: IScannedFile): Promise<string | null> {
    try {
      return await this.hasher.sha256(file.originalPath);
    } catch {
      return null; // Treat as non-duplicate on error
    }
  }
}

// image-dimensions-strategy.ts
export class ImageDimensionsStrategy implements IDedupeStrategy {
  readonly name = 'imageDimensions';
  readonly priority = 50;

  constructor(
    private readonly metadataExtractor: IMetadataExtractor,
    private readonly supportedExtensions: readonly string[] // From constants module
  ) {}

  supports(file: IScannedFile): boolean {
    return this.supportedExtensions.includes(file.extension.toLowerCase());
  }

  async getKey(file: IScannedFile): Promise<string | null> {
    const dims = await this.metadataExtractor.extractDimensions(file.originalPath);
    return dims ? `${dims.width}x${dims.height}` : null;
  }
}
```

### Integration with Existing Components

#### Updated IFileOrganizer Interface

The `IFileOrganizer` interface gains dedupe capability through composition:

```typescript
// src/organizer/interfaces.ts
export interface IFileOrganizer {
  planOperations(files: IScannedFile[]): IFileOperation[];
  executeOperations(operations: IFileOperation[]): IOrganizationResult;
}

// FileOrganizer implementation receives IDedupeService via constructor
export class FileOrganizer implements IFileOrganizer {
  constructor(
    private readonly planner: IOperationPlanner,
    private readonly executor: IOperationExecutor,
    private readonly dedupeService: IDedupeService | null, // Optional
    private readonly logger: ILogger,
    private readonly config: IOrderlyConfig
  ) {}

  async planOperations(files: IScannedFile[]): Promise<IFileOperation[]> {
    let filesToPlan = files;

    // Run dedupe if enabled and service is provided
    if (this.config.dedupe?.enabled && this.dedupeService) {
      const dedupeResult = await this.dedupeService.findDuplicates(files);
      const outcome = await this.dedupeService.applyAction(
        dedupeResult,
        this.config.dedupe.action
      );

      if (this.config.dedupe.action === DedupeAction.SKIP) {
        filesToPlan = this.removeDuplicates(files, outcome.skipped);
      }
    }

    return this.planner.plan(filesToPlan);
  }
}
```

#### Updated Configuration Interface

**Location:** `src/config/interfaces.ts` (extends existing)

```typescript
export interface IOrderlyConfig {
  // ... existing fields ...
  
  /** De-duplication configuration (optional) */
  dedupe?: IDedupeConfig;
}
```

#### CLI Integration

New dedupe command follows `ICommand` pattern from improvement #3:

```typescript
// src/cli/commands/dedupe.ts
export interface IDedupeCommand extends ICommand<DedupeOptions> {
  execute(options: DedupeOptions): Promise<void>;
}

export interface DedupeOptions {
  directory?: string;
  config?: string;
  strategy?: string[];
  action?: DedupeAction;
  report?: string;
  dryRun?: boolean;
}

export class DedupeCommand implements IDedupeCommand {
  constructor(
    private readonly scannerFactory: (config: IOrderlyConfig) => IFileScanner,
    private readonly dedupeServiceFactory: (config: IOrderlyConfig) => IDedupeService,
    private readonly displayService: IDisplayService,
    private readonly logger: ILogger
  ) {}

  async execute(options: DedupeOptions): Promise<void> {
    // Implementation using injected dependencies
  }
}
```

### Dedupe Error Types

Extends the error module from improvement #5:

```typescript
// src/errors/dedupe-error.ts
import { OrderlyError } from './base-error';
import { ErrorCategory, ErrorCode } from './interfaces';

export class HashingError extends OrderlyError {
  readonly code = ErrorCode.HASHING_FAILED;
  readonly category = ErrorCategory.FILE_OPERATION;

  constructor(path: string, cause: string) {
    super(`Failed to hash file: ${path}`, { path, cause });
  }
}

export class MetadataReadError extends OrderlyError {
  readonly code = ErrorCode.METADATA_READ_FAILED;
  readonly category = ErrorCategory.FILE_OPERATION;

  constructor(path: string, metadataType: string, cause: string) {
    super(`Failed to read ${metadataType} metadata: ${path}`, { path, metadataType, cause });
  }
}

export class StrategyError extends OrderlyError {
  readonly code = ErrorCode.STRATEGY_FAILED;
  readonly category = ErrorCategory.VALIDATION;

  constructor(strategyName: string, file: string, cause: string) {
    super(`Strategy '${strategyName}' failed for file: ${file}`, { strategyName, file, cause });
  }
}
```

### File Structure

```
src/dedupe/
├── index.ts                      # Barrel exports
├── interfaces.ts                 # IDedupeService, IDedupeStrategy, etc.
├── types.ts                      # DedupeAction, IDedupeResult, etc.
├── dedupe-service.ts             # DedupeService implements IDedupeService
├── dedupe-service.test.ts
├── strategies/
│   ├── index.ts
│   ├── name-strategy.ts
│   ├── name-strategy.test.ts
│   ├── size-strategy.ts
│   ├── size-strategy.test.ts
│   ├── sha256-strategy.ts
│   ├── sha256-strategy.test.ts
│   ├── image-dimensions-strategy.ts
│   ├── image-dimensions-strategy.test.ts
│   ├── exif-strategy.ts
│   ├── exif-strategy.test.ts
│   ├── file-properties-strategy.ts
│   ├── file-properties-strategy.test.ts
│   └── file-attributes-strategy.ts
├── hashers/
│   ├── index.ts
│   ├── sha256-hasher.ts
│   └── sha256-hasher.test.ts
├── metadata/
│   ├── index.ts
│   ├── metadata-reader.ts
│   └── metadata-reader.test.ts
└── report/
    ├── index.ts
    ├── dedupe-report-writer.ts
    └── dedupe-report-writer.test.ts
```

### Constants Reuse

The dedupe feature reuses constants from improvement #6:

```typescript
// src/dedupe/strategies/image-dimensions-strategy.ts
import { IMAGE_EXTENSIONS } from '../../constants/file-extensions';

export class ImageDimensionsStrategy implements IDedupeStrategy {
  constructor(
    private readonly metadataExtractor: IMetadataExtractor,
    private readonly supportedExtensions = IMAGE_EXTENSIONS
  ) {}

  supports(file: IScannedFile): boolean {
    return this.supportedExtensions.includes(file.extension.toLowerCase());
  }
}
```

### Dependency Graph

```
                    ┌─────────────────────────────────────┐
                    │           IOrderlyConfig            │
                    │  (extended with IDedupeConfig)      │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │          IFileOrganizer             │
                    │  (receives IDedupeService)          │
                    └──────────────┬──────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│ IOperationPlanner│    │   IDedupeService    │    │ IOperationExecutor │
└─────────────────┘    └─────────┬───────────┘    └─────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ IDedupeStrategy │ │ IDedupeHasher   │ │IDedupeMetadata  │
    │   (multiple)    │ │                 │ │    Reader       │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Dedupe Feature Task Checklist

**Interface Definition Tasks:**

- [ ] Create `src/dedupe/interfaces.ts` with all behavior interfaces
- [ ] Create `src/dedupe/types.ts` with all data types and enums
- [ ] Update `IOrderlyConfig` to include optional `dedupe` field
- [ ] Create dedupe error types in `src/errors/dedupe-error.ts`

**Core Implementation Tasks:**

- [ ] Implement `DedupeService` implementing `IDedupeService`
- [ ] Implement `NameStrategy` implementing `IDedupeStrategy`
- [ ] Implement `SizeStrategy` implementing `IDedupeStrategy`
- [ ] Implement `Sha256Strategy` implementing `IDedupeStrategy`
- [ ] Implement `Sha256Hasher` implementing `IDedupeHasher`

**Advanced Strategy Tasks:**

- [ ] Implement `MetadataExtractor` implementing `IMetadataExtractor`
- [ ] Implement `ImageDimensionsStrategy` implementing `IDedupeStrategy`
- [ ] Implement `ExifStrategy` implementing `IDedupeStrategy`
- [ ] Implement `FilePropertiesStrategy` implementing `IDedupeStrategy`
- [ ] Implement `FileAttributesStrategy` implementing `IDedupeStrategy`

**Integration Tasks:**

- [ ] Update `FileOrganizer` constructor to accept optional `IDedupeService`
- [ ] Implement dedupe execution before operation planning
- [ ] Implement `DedupeReportWriter` implementing `IDedupeReportWriter`
- [ ] Create `DedupeCommand` implementing `IDedupeCommand`
- [ ] Add dedupe options to `organize` command

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] `npm run lint` shows no new warnings
- [ ] All dedupe tests pass in isolation
- [ ] Integration tests pass with dedupe enabled
- [ ] Integration tests pass with dedupe disabled (backward compatibility)

**Validation Criteria:**

- [ ] All dedupe classes implement corresponding interfaces
- [ ] `IDedupeService` can be mocked for `FileOrganizer` tests
- [ ] Each strategy is injectable and testable in isolation
- [ ] All dedupe errors extend `IOrderlyError`
- [ ] Constants module provides `IMAGE_EXTENSIONS` for dimension strategy
- [ ] CLI dedupe command follows `ICommand` pattern
- [ ] Existing organize behavior unchanged when dedupe is disabled
- [ ] `DedupeService.findDuplicates()` returns valid `IDedupeResult`
- [ ] `DedupeService.applyAction()` returns valid `IDedupeOutcome`
- [ ] All 7 strategies correctly implement `supports()` and `getKey()` methods
- [ ] Report output is correctly formatted (JSON and Markdown)

**TDD Test Specifications:**

*File: `src/dedupe/dedupe-service.test.ts` (new)*

```typescript
import type { IDedupeService, IDedupeStrategy, IDedupeHasher } from './interfaces';
import type { IDedupeResult, IDedupeOutcome, DedupeAction } from './types';
import { DedupeService } from './dedupe-service';

describe('DedupeService', () => {
  let service: IDedupeService;
  let mockStrategies: jest.Mocked<IDedupeStrategy>[];
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockStrategies = [
      { name: 'name', priority: 10, supports: jest.fn(), getKey: jest.fn() },
      { name: 'size', priority: 5, supports: jest.fn(), getKey: jest.fn() }
    ];
    service = new DedupeService(mockStrategies, mockLogger);
  });

  describe('IDedupeService contract', () => {
    it('should implement IDedupeService interface', () => {
      expect(service.findDuplicates).toBeDefined();
      expect(service.applyAction).toBeDefined();
    });
  });

  describe('findDuplicates()', () => {
    it('should return IDedupeResult with groups property', async () => {
      // Given: Files with potential duplicates
      const files = [mockFile1, mockFile2, mockFile3];
      mockStrategies[0].supports.mockReturnValue(true);
      mockStrategies[0].getKey.mockResolvedValue('same-key');
      
      // When: Finding duplicates
      const result = await service.findDuplicates(files);
      
      // Then: Returns valid IDedupeResult
      expect(result).toHaveProperty('groups');
      expect(result).toHaveProperty('totalFiles');
      expect(result).toHaveProperty('totalDuplicates');
      expect(result).toHaveProperty('strategiesUsed');
    });

    it('should group files with matching keys', async () => {
      // Given: Two files with same key
      const files = [
        { ...mockFile, originalPath: '/a.txt' },
        { ...mockFile, originalPath: '/b.txt' }
      ];
      mockStrategies[0].getKey.mockResolvedValue('duplicate-key');
      
      // When: Finding duplicates
      const result = await service.findDuplicates(files);
      
      // Then: Files grouped together
      expect(result.groups.length).toBeGreaterThan(0);
      expect(result.groups[0].files.length).toBe(2);
    });

    it('should NOT group files with different keys', async () => {
      // Given: Two files with different keys
      mockStrategies[0].getKey
        .mockResolvedValueOnce('key-1')
        .mockResolvedValueOnce('key-2');
      
      // When: Finding duplicates
      const result = await service.findDuplicates([mockFile1, mockFile2]);
      
      // Then: No duplicate groups (single files excluded)
      expect(result.totalDuplicates).toBe(0);
    });

    it('should skip files not supported by strategy', async () => {
      // Given: Strategy that doesn't support file
      mockStrategies[0].supports.mockReturnValue(false);
      
      // When: Finding duplicates
      const result = await service.findDuplicates([mockFile]);
      
      // Then: getKey not called for unsupported file
      expect(mockStrategies[0].getKey).not.toHaveBeenCalled();
    });

    it('should execute strategies in priority order', async () => {
      // Given: Strategies with different priorities
      const callOrder: string[] = [];
      mockStrategies[0].getKey.mockImplementation(async () => {
        callOrder.push('name');
        return 'key';
      });
      mockStrategies[1].getKey.mockImplementation(async () => {
        callOrder.push('size');
        return 'key';
      });
      
      // When: Finding duplicates
      await service.findDuplicates([mockFile]);
      
      // Then: Lower priority (5) runs before higher (10)
      expect(callOrder[0]).toBe('size');
      expect(callOrder[1]).toBe('name');
    });
  });

  describe('applyAction()', () => {
    it('should return IDedupeOutcome', async () => {
      // Given: Dedupe result with duplicates
      const result: IDedupeResult = { groups: [mockGroup], totalFiles: 3, totalDuplicates: 2, strategiesUsed: ['name'] };
      
      // When: Applying action
      const outcome = await service.applyAction(result, DedupeAction.SKIP);
      
      // Then: Returns valid IDedupeOutcome
      expect(outcome).toHaveProperty('action');
      expect(outcome).toHaveProperty('skipped');
      expect(outcome).toHaveProperty('replaced');
      expect(outcome).toHaveProperty('reported');
      expect(outcome).toHaveProperty('errors');
    });

    it('should populate skipped array for SKIP action', async () => {
      const outcome = await service.applyAction(mockResult, DedupeAction.SKIP);
      expect(outcome.skipped.length).toBeGreaterThan(0);
      expect(outcome.action).toBe(DedupeAction.SKIP);
    });

    it('should populate reported array for REPORT action', async () => {
      const outcome = await service.applyAction(mockResult, DedupeAction.REPORT);
      expect(outcome.reported.length).toBeGreaterThan(0);
      expect(outcome.action).toBe(DedupeAction.REPORT);
    });

    it('should populate replaced array for REPLACE action', async () => {
      const outcome = await service.applyAction(mockResult, DedupeAction.REPLACE);
      expect(outcome.replaced.length).toBeGreaterThan(0);
      expect(outcome.action).toBe(DedupeAction.REPLACE);
    });
  });
});
```

*File: `src/dedupe/strategies/name-strategy.test.ts` (new)*

```typescript
import type { IDedupeStrategy } from '../interfaces';
import { NameStrategy } from './name-strategy';

describe('NameStrategy', () => {
  describe('IDedupeStrategy contract', () => {
    let strategy: IDedupeStrategy;

    beforeEach(() => {
      strategy = new NameStrategy({ caseSensitive: false, ignoreExtension: false });
    });

    it('should implement IDedupeStrategy interface', () => {
      expect(strategy.name).toBe('name');
      expect(strategy.priority).toBe(10);
      expect(strategy.supports).toBeDefined();
      expect(strategy.getKey).toBeDefined();
    });

    it('should support all files', () => {
      expect(strategy.supports(mockFile)).toBe(true);
    });
  });

  describe('getKey() - case sensitivity', () => {
    it('should return lowercase key when caseSensitive is false', async () => {
      const strategy = new NameStrategy({ caseSensitive: false, ignoreExtension: false });
      const file = { ...mockFile, filename: 'MyFile.TXT' };
      
      const key = await strategy.getKey(file);
      
      expect(key).toBe('myfile.txt');
    });

    it('should preserve case when caseSensitive is true', async () => {
      const strategy = new NameStrategy({ caseSensitive: true, ignoreExtension: false });
      const file = { ...mockFile, filename: 'MyFile.TXT' };
      
      const key = await strategy.getKey(file);
      
      expect(key).toBe('MyFile.TXT');
    });
  });

  describe('getKey() - extension handling', () => {
    it('should include extension by default', async () => {
      const strategy = new NameStrategy({ caseSensitive: false, ignoreExtension: false });
      const file = { ...mockFile, filename: 'document.pdf', extension: '.pdf' };
      
      const key = await strategy.getKey(file);
      
      expect(key).toBe('document.pdf');
    });

    it('should exclude extension when ignoreExtension is true', async () => {
      const strategy = new NameStrategy({ caseSensitive: false, ignoreExtension: true });
      const file = { ...mockFile, filename: 'document.pdf', extension: '.pdf' };
      
      const key = await strategy.getKey(file);
      
      expect(key).toBe('document');
    });
  });
});
```

*File: `src/dedupe/strategies/sha256-strategy.test.ts` (new)*

```typescript
import type { IDedupeStrategy, IDedupeHasher } from '../interfaces';
import { Sha256Strategy } from './sha256-strategy';

describe('Sha256Strategy', () => {
  let strategy: IDedupeStrategy;
  let mockHasher: jest.Mocked<IDedupeHasher>;

  beforeEach(() => {
    mockHasher = { sha256: jest.fn() };
    strategy = new Sha256Strategy(mockHasher);
  });

  describe('IDedupeStrategy contract', () => {
    it('should implement IDedupeStrategy interface', () => {
      expect(strategy.name).toBe('sha256');
      expect(strategy.priority).toBe(100);
      expect(strategy.supports).toBeDefined();
      expect(strategy.getKey).toBeDefined();
    });

    it('should have high priority (runs last - expensive)', () => {
      expect(strategy.priority).toBeGreaterThanOrEqual(100);
    });
  });

  describe('getKey()', () => {
    it('should delegate to IDedupeHasher', async () => {
      mockHasher.sha256.mockResolvedValue('abc123hash');
      
      const key = await strategy.getKey(mockFile);
      
      expect(mockHasher.sha256).toHaveBeenCalledWith(mockFile.originalPath);
      expect(key).toBe('abc123hash');
    });

    it('should return null on hashing error', async () => {
      mockHasher.sha256.mockRejectedValue(new Error('Read error'));
      
      const key = await strategy.getKey(mockFile);
      
      expect(key).toBeNull();
    });

    it('should support all file types', () => {
      expect(strategy.supports(mockFile)).toBe(true);
    });
  });
});
```

*File: `src/dedupe/strategies/image-dimensions-strategy.test.ts` (new)*

```typescript
import type { IDedupeStrategy, IMetadataExtractor } from '../interfaces';
import { ImageDimensionsStrategy } from './image-dimensions-strategy';
import { IMAGE_EXTENSIONS } from '../../constants/file-extensions';

describe('ImageDimensionsStrategy', () => {
  let strategy: IDedupeStrategy;
  let mockReader: jest.Mocked<IMetadataExtractor>;

  beforeEach(() => {
    mockReader = {
      getImageDimensions: jest.fn(),
      getExif: jest.fn(),
      getFileProperties: jest.fn(),
      getFileAttributes: jest.fn()
    };
    strategy = new ImageDimensionsStrategy(mockReader, IMAGE_EXTENSIONS);
  });

  describe('supports()', () => {
    it('should support image file extensions', () => {
      const jpgFile = { ...mockFile, extension: '.jpg' };
      const pngFile = { ...mockFile, extension: '.png' };
      
      expect(strategy.supports(jpgFile)).toBe(true);
      expect(strategy.supports(pngFile)).toBe(true);
    });

    it('should NOT support non-image extensions', () => {
      const txtFile = { ...mockFile, extension: '.txt' };
      const pdfFile = { ...mockFile, extension: '.pdf' };
      
      expect(strategy.supports(txtFile)).toBe(false);
      expect(strategy.supports(pdfFile)).toBe(false);
    });

    it('should be case-insensitive for extensions', () => {
      const upperFile = { ...mockFile, extension: '.JPG' };
      expect(strategy.supports(upperFile)).toBe(true);
    });
  });

  describe('getKey()', () => {
    it('should return dimensions as WIDTHxHEIGHT string', async () => {
      mockReader.getImageDimensions.mockResolvedValue({ width: 1920, height: 1080 });
      
      const key = await strategy.getKey(mockFile);
      
      expect(key).toBe('1920x1080');
    });

    it('should return null when dimensions unavailable', async () => {
      mockReader.getImageDimensions.mockResolvedValue(null);
      
      const key = await strategy.getKey(mockFile);
      
      expect(key).toBeNull();
    });

    it('should use IMAGE_EXTENSIONS from constants module', () => {
      // Strategy should use imported constants
      expect(IMAGE_EXTENSIONS).toContain('.jpg');
      expect(IMAGE_EXTENSIONS).toContain('.png');
    });
  });
});
```

*File: `src/dedupe/hashers/sha256-hasher.test.ts` (new)*

```typescript
import type { IDedupeHasher } from '../interfaces';
import { Sha256Hasher } from './sha256-hasher';

describe('Sha256Hasher', () => {
  let hasher: IDedupeHasher;

  beforeEach(() => {
    hasher = new Sha256Hasher();
  });

  describe('IDedupeHasher contract', () => {
    it('should implement IDedupeHasher interface', () => {
      expect(hasher.sha256).toBeDefined();
    });
  });

  describe('sha256()', () => {
    it('should return hex-encoded hash string', async () => {
      // Given: A test file with known content
      const filePath = '/test/file.txt';
      
      // When: Computing hash (with mocked fs)
      const hash = await hasher.sha256(filePath);
      
      // Then: Returns 64-character hex string
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should return same hash for identical content', async () => {
      const hash1 = await hasher.sha256('/test/file1.txt');
      const hash2 = await hasher.sha256('/test/file1-copy.txt');
      
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different content', async () => {
      const hash1 = await hasher.sha256('/test/file1.txt');
      const hash2 = await hasher.sha256('/test/file2.txt');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should throw on file read error', async () => {
      await expect(hasher.sha256('/nonexistent/file.txt')).rejects.toThrow();
    });
  });
});
```

*File: `src/dedupe/report/dedupe-report-writer.test.ts` (new)*

```typescript
import type { IDedupeReportWriter } from '../interfaces';
import type { IDedupeResult } from '../types';
import { DedupeReportWriter } from './dedupe-report-writer';

describe('DedupeReportWriter', () => {
  let writer: IDedupeReportWriter;
  let mockFileSystem: jest.Mocked<IFileSystem>;

  beforeEach(() => {
    mockFileSystem = { writeFileSync: jest.fn() };
    writer = new DedupeReportWriter(mockFileSystem);
  });

  describe('IDedupeReportWriter contract', () => {
    it('should implement IDedupeReportWriter interface', () => {
      expect(writer.write).toBeDefined();
      expect(writer.writeMarkdown).toBeDefined();
    });
  });

  describe('write()', () => {
    it('should write JSON report to specified path', async () => {
      const result: IDedupeResult = mockDedupeResult;
      
      await writer.write(result, '/output/report.json');
      
      expect(mockFileSystem.writeFileSync).toHaveBeenCalledWith(
        '/output/report.json',
        expect.any(String)
      );
    });

    it('should produce valid JSON', async () => {
      await writer.write(mockDedupeResult, '/output/report.json');
      
      const jsonContent = mockFileSystem.writeFileSync.mock.calls[0][1];
      expect(() => JSON.parse(jsonContent)).not.toThrow();
    });
  });

  describe('writeMarkdown()', () => {
    it('should write markdown report to specified path', async () => {
      await writer.writeMarkdown(mockDedupeResult, '/output/report.md');
      
      expect(mockFileSystem.writeFileSync).toHaveBeenCalledWith(
        '/output/report.md',
        expect.stringContaining('#')
      );
    });

    it('should include duplicate groups as tables', async () => {
      await writer.writeMarkdown(mockDedupeResult, '/output/report.md');
      
      const mdContent = mockFileSystem.writeFileSync.mock.calls[0][1];
      expect(mdContent).toContain('|');
    });
  });
});
```

---

## Implementation Priority Matrix

| # | Improvement | Priority | Risk | IDD Impact | Dependencies |
| - | ----------- | -------- | ---- | ---------- | ------------ |
| 1 | Consolidate ConfigFormat | 🔴 High | Low | Medium | None |
| 2 | Extract Organizer Interfaces | 🔴 High | Medium | **Critical** | None |
| 7 | Fix Utils Export Extensions | 🔴 High | Low | Medium | None |
| 4 | Add Interface Tests | 🟡 Medium | Low | High | #2 |
| 3 | Refactor CLI | 🟡 Medium | Medium | High | #1, #2 |
| 5 | Create Errors Module | 🟢 Low | Low | High | None |
| 6 | Create Constants Module | 🟢 Low | Low | Medium | None |
| 8 | **Dedupe Feature** | 🟢 Low | Medium | **Critical** | #2, #5, #6 |

**Legend:**

- 🔴 High Priority: Core IDD foundation work
- 🟡 Medium Priority: Important enhancements  
- 🟢 Low Priority: Nice to have improvements
- **IDD Impact**: How much this improves interface-driven architecture

---

## Implementation Schedule

The implementation follows an interface-first approach: define contracts before implementations. The dedupe feature is integrated starting at Phase 6, benefiting from all prior foundational work.

### Phase 1: Foundation - Interface Layer

**Goal:** Establish the core interface contracts.

**Tasks:**

- [ ] #1: Consolidate ConfigFormat enum
- [ ] #7: Fix utils barrel export and add interface re-exports
- [ ] Create `src/types/file-system.ts` with `IFileSystem` interface
- [ ] Create `src/scanner/interfaces.ts` with `IFileScanner`, `IScannedFile`

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] No TypeScript import resolution errors

**Validation Criteria:**

- [ ] Single `ConfigFormat` enum exists in `src/config/types.ts`
- [ ] `src/utils/index.ts` has no `.js` extensions
- [ ] `src/types/file-system.ts` exports `IFileSystem` and `IFileStats`
- [ ] `src/scanner/interfaces.ts` exports `IFileScanner` and `IScannedFile`

### Phase 2: Core Interfaces - Organizer Module

**Goal:** Extract and define organizer interfaces.

**Tasks:**

- [ ] #2: Create `src/organizer/interfaces.ts` with all organizer interfaces
- [ ] Create `src/organizer/types.ts` with data types and enums
- [ ] Update classes to implement interfaces (`implements I*`)
- [ ] Update all imports across the codebase

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] No circular dependency warnings

**Validation Criteria:**

- [ ] `src/organizer/interfaces.ts` exists with `IFileOrganizer`, `IOperationPlanner`, `IOperationExecutor`
- [ ] `src/organizer/types.ts` exists with `FileOperationType`, `IFileOperation`
- [ ] All organizer classes include `implements I*` declarations
- [ ] No interface definitions remain in implementation files

### Phase 3: Test Infrastructure

**Goal:** Update tests to use interface-driven patterns.

**Tasks:**

- [ ] #4: Add tests for `ConsoleOutputWriter` implementing `IOutputWriter`
- [ ] Update existing tests to declare variables with interface types
- [ ] Create mock factories for common interfaces

**Verification Criteria:**

- [ ] `npm run test` passes with no failures
- [ ] `npm run test:coverage` shows coverage above baseline

**Validation Criteria:**

- [ ] `src/utils/console-output.writer.test.ts` exists
- [ ] Test files use interface types for variable declarations
- [ ] Coverage for `console-output.writer.ts` exceeds 80%

### Phase 4: CLI Restructure with Services

**Goal:** Refactor CLI using command and service interfaces.

**Tasks:**

- [ ] #3: Create `src/cli/interfaces.ts` with command interfaces
- [ ] Create service implementations in `src/cli/services/`
- [ ] Create command implementations in `src/cli/commands/`
- [ ] Wire up dependencies in `src/cli/index.ts`
- [ ] Update `package.json` bin path
- [ ] Delete old `src/cli.ts`

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] CLI commands execute correctly: `orderly --help`
- [ ] All three commands work: `organize`, `init`, `scan`

**Validation Criteria:**

- [ ] `src/cli/interfaces.ts` exports `ICommand`, `IOrganizeCommand`, `IInitCommand`, `IScanCommand`
- [ ] All command classes implement corresponding interfaces
- [ ] All service classes implement corresponding interfaces
- [ ] `src/cli.ts` no longer exists
- [ ] No file in `src/cli/` exceeds 70 lines

### Phase 5: Error Handling & Constants

**Goal:** Complete the interface ecosystem (prerequisite for dedupe).

**Tasks:**

- [ ] #5: Create `src/errors/interfaces.ts` with `IOrderlyError`
- [ ] Implement typed error classes in `src/errors/`
- [ ] #6: Create `src/constants/` with type-safe definitions
- [ ] Add `IMAGE_EXTENSIONS` constant (reused by dedupe)
- [ ] Migrate existing throw statements to use typed errors

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] TypeScript correctly infers error types

**Validation Criteria:**

- [ ] `src/errors/interfaces.ts` exports `IOrderlyError`, `ErrorCategory`, `ErrorCode`
- [ ] All error classes extend `OrderlyError` base class
- [ ] `src/constants/file-extensions.ts` exports `IMAGE_EXTENSIONS`
- [ ] At least 3 throw statements migrated to typed errors
- [ ] Type guard `isOrderlyError()` exists and works correctly

### Phase 6: Dedupe Feature - Interfaces

**Goal:** Define all dedupe interfaces before implementation.

**Tasks:**

- [ ] Create `src/dedupe/interfaces.ts` with:
  - `IDedupeService`
  - `IDedupeStrategy`
  - `IDedupeHasher`
  - `IMetadataExtractor`
  - `IDedupeReportWriter`
- [ ] Create `src/dedupe/types.ts` with:
  - `DedupeAction`, `DedupeMode` enums
  - `IDedupeConfig`, `IDedupeResult`, `IDedupeOutcome`
  - `IDuplicateGroup`, `IDedupeCandidate`
- [ ] Update `IOrderlyConfig` to include optional `dedupe` field
- [ ] Create dedupe error types extending `IOrderlyError`

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] TypeScript reports no type errors in dedupe interfaces
- [ ] All interfaces are importable from `src/dedupe`

**Validation Criteria:**

- [ ] `src/dedupe/interfaces.ts` exports all 5 behavior interfaces
- [ ] `src/dedupe/types.ts` exports all data types and enums
- [ ] `IOrderlyConfig` includes optional `dedupe?: IDedupeConfig` field
- [ ] Dedupe error types extend `OrderlyError`
- [ ] No implementation code exists yet (interfaces only)

### Phase 7: Dedupe Feature - Core Implementation

**Goal:** Implement dedupe service and base strategies.

**Tasks:**

- [ ] Implement `DedupeService` implementing `IDedupeService`
- [ ] Implement `NameStrategy` implementing `IDedupeStrategy`
- [ ] Implement `SizeStrategy` implementing `IDedupeStrategy`
- [ ] Implement `Sha256Strategy` implementing `IDedupeStrategy`
- [ ] Implement `Sha256Hasher` implementing `IDedupeHasher`
- [ ] Create `src/dedupe/dedupe-service.test.ts`
- [ ] Create `src/dedupe/strategies/name-strategy.test.ts`
- [ ] Create `src/dedupe/strategies/size-strategy.test.ts`
- [ ] Create `src/dedupe/strategies/sha256-strategy.test.ts`

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] All new test files pass

**Validation Criteria:**

- [ ] `DedupeService` class includes `implements IDedupeService`
- [ ] All strategy classes include `implements IDedupeStrategy`
- [ ] `Sha256Hasher` class includes `implements IDedupeHasher`
- [ ] Unit tests mock `IFileSystem` and `IDedupeHasher` interfaces
- [ ] `DedupeService.findDuplicates()` returns valid `IDedupeResult`
- [ ] `DedupeService.applyAction()` returns valid `IDedupeOutcome`

### Phase 8: Dedupe Feature - Advanced Strategies

**Goal:** Implement metadata-based strategies.

**Tasks:**

- [ ] Implement `MetadataExtractor` implementing `IMetadataExtractor`
- [ ] Implement `ImageDimensionsStrategy` (reuses `IMAGE_EXTENSIONS`)
- [ ] Implement `ExifStrategy`
- [ ] Implement `FilePropertiesStrategy`
- [ ] Implement `FileAttributesStrategy`
- [ ] Create `src/dedupe/strategies/image-dimensions-strategy.test.ts`
- [ ] Create `src/dedupe/strategies/exif-strategy.test.ts`
- [ ] Create `src/dedupe/strategies/file-properties-strategy.test.ts`
- [ ] Create `src/dedupe/strategies/file-attributes-strategy.test.ts`

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] All strategy tests pass with mocked metadata reader

**Validation Criteria:**

- [ ] All advanced strategy classes include `implements IDedupeStrategy`
- [ ] `MetadataExtractor` class includes `implements IMetadataExtractor`
- [ ] `ImageDimensionsStrategy` imports `IMAGE_EXTENSIONS` from constants module
- [ ] `ImageDimensionsStrategy.supports()` correctly filters image files
- [ ] Each strategy's `getKey()` returns expected format or null
- [ ] Unit tests mock `IMetadataExtractor` interface

### Phase 9: Dedupe Feature - Integration

**Goal:** Integrate dedupe into the organize pipeline.

**Tasks:**

- [ ] Update `FileOrganizer` constructor to accept optional `IDedupeService`
- [ ] Implement dedupe execution before operation planning
- [ ] Implement `DedupeReportWriter` implementing `IDedupeReportWriter`
- [ ] Create integration tests for full dedupe flow
- [ ] Create `src/dedupe/report/dedupe-report-writer.test.ts`

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] Integration tests pass with dedupe enabled
- [ ] Integration tests pass with dedupe disabled

**Validation Criteria:**

- [ ] `FileOrganizer` accepts `IDedupeService | null` in constructor
- [ ] Dedupe runs before `OperationPlanner.plan()` when enabled
- [ ] `DedupeReportWriter` generates valid JSON output
- [ ] `DedupeReportWriter` generates valid Markdown output
- [ ] Existing tests continue to pass (backward compatibility)
- [ ] Organize command works correctly without dedupe config

### Phase 10: Dedupe Feature - CLI & Polish

**Goal:** Add CLI command and finalize.

**Tasks:**

- [ ] Create `DedupeCommand` implementing `IDedupeCommand`
- [ ] Add dedupe options to `organize` command (`--dedupe`, `--dedupe-strategy`, `--dedupe-action`)
- [ ] Add configuration defaults for dedupe in config schema
- [ ] Add dedupe section to README documentation
- [ ] Add usage examples for dedupe command
- [ ] Performance testing with large file sets (100+ files)

**Verification Criteria:**

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes with no failures
- [ ] `orderly dedupe --help` displays help correctly
- [ ] `orderly organize --dedupe --help` shows dedupe options
- [ ] Large file set test completes without timeout or memory issues

**Validation Criteria:**

- [ ] `DedupeCommand` class includes `implements IDedupeCommand`
- [ ] Dedupe options documented in `--help` output
- [ ] README includes dedupe feature documentation
- [ ] Default dedupe config has `enabled: false` (backward compatible)
- [ ] Standalone `orderly dedupe` command works correctly
- [ ] Integrated `orderly organize --dedupe` command works correctly
- [ ] Performance is acceptable for 100+ file sets

---

## Post-Implementation Verification

After all improvements are complete, run the following verification steps:

```bash
# Clean build
npm run clean && npm run build

# Full test suite with coverage
npm run test:coverage

# Linting
npm run lint

# Type checking
npm run typecheck

# Format check
npm run format:check

# Full verification
npm run verify
```

**Success Criteria:**

- All commands pass without errors
- Test coverage remains above current baseline
- No new linting warnings
- Build output size is similar or smaller
- All classes have corresponding interface implementations
- No direct class dependencies (only interface dependencies)
- Dedupe feature is fully functional and backward compatible

---

## IDD Verification Checklist

After completing all phases, verify the interface-driven architecture:

### Interface Coverage

- [ ] Every major class has a corresponding interface
- [ ] Interfaces are in separate files from implementations
- [ ] All class declarations include `implements I*`
- [ ] Dedupe module has complete interface coverage

### Dependency Direction

- [ ] No circular dependencies between modules
- [ ] Dependencies flow toward abstractions (interfaces)
- [ ] Concrete classes are not directly imported (use interfaces)
- [ ] `DedupeService` depends only on `IDedupeStrategy`, not concrete strategies

### Testability

- [ ] Tests can instantiate classes with mock dependencies
- [ ] All dependencies are injectable via constructor
- [ ] No static method calls to concrete classes in business logic
- [ ] Dedupe strategies are testable with mocked `IDedupeHasher`, `IMetadataExtractor`

### Export Structure

- [ ] Barrel exports list interfaces before implementations
- [ ] Public API exports interfaces for external consumers
- [ ] Type-only imports used for interface imports where possible
- [ ] `src/dedupe/index.ts` exports interfaces first

### Dedupe-Specific Verification

- [ ] All 7 strategies implement `IDedupeStrategy`
- [ ] `IDedupeService.findDuplicates()` returns `IDedupeResult`
- [ ] `IDedupeService.applyAction()` returns `IDedupeOutcome`
- [ ] Dedupe errors extend `IOrderlyError`
- [ ] `IMAGE_EXTENSIONS` constant is reused from constants module
- [ ] Dedupe is disabled by default (backward compatible)
- [ ] Dedupe works with both `organize` and standalone `dedupe` commands

---

## Rollback Plan

If issues arise during implementation:

1. **Git Strategy:** Create a feature branch for each improvement
2. **Incremental Commits:** Commit after each logical change
3. **Quick Rollback:** `git revert` specific commits if needed
4. **Full Rollback:** `git reset --hard` to pre-improvement state

**Branch Naming Convention:**

- `improve/idd-foundation-interfaces`
- `improve/idd-organizer-interfaces`
- `improve/idd-cli-refactor`
- `improve/idd-error-interfaces`
- `feature/dedupe-interfaces`
- `feature/dedupe-core`
- `feature/dedupe-strategies`
- `feature/dedupe-integration`

---

## Appendix A: Naming Conventions & Vocabulary

### Interface Naming Patterns

| Pattern | Usage | Example |
| ------- | ----- | ------- |
| `I<Noun>` | Behavior contracts (services) | `IFileScanner`, `ILogger`, `IDedupeService` |
| `I<Noun>` | Data transfer objects (DTOs) | `IScannedFile`, `IFileOperation`, `IDedupeResult` |
| `<Noun>` | Enums (type-safe constants) | `FileOperationType`, `LogLevel`, `DedupeAction` |
| `<Noun>` | Type aliases | `ReadonlyExtensionList`, `DedupeKey` |

### Method Naming Vocabulary

Use consistent verbs across interfaces for similar actions:

| Action Type | Verb | Example | Avoid |
| ----------- | ---- | ------- | ----- |
| **Query/Read** | `get`, `find`, `scan` | `getConfig()`, `findDuplicates()` | `fetch`, `retrieve` |
| **Transform** | `transform`, `format`, `build` | `transform()`, `format()` | `apply`, `convert` |
| **Check/Validate** | `requires`, `is`, `has`, `can` | `requiresRename()`, `isValid()` | `needs`, `check`, `should` |
| **Create** | `create`, `build`, `generate` | `createOperation()`, `generate()` | `make`, `construct` |
| **Execute** | `execute`, `run`, `process` | `execute()`, `process()` | `do`, `perform` |
| **Extract** | `extract`, `parse` | `extractDimensions()`, `parse()` | `get`, `read` |
| **Plan** | `plan` | `plan()` | `prepare`, `schedule` |
| **Save/Write** | `save`, `write` | `save()`, `write()` | `store`, `persist` |

### Property Naming Vocabulary

| Concept | Property Name | Type | Avoid |
| ------- | ------------- | ---- | ----- |
| **Path reference** | `*Path` | `string` | `*Location`, `*File` |
| **Name without path** | `filename`, `*Name` | `string` | `file`, `name` (ambiguous) |
| **Boolean state** | `is*`, `has*`, `requires*` | `boolean` | `should*`, `needs*` |
| **Proposed value** | `proposed*` | `<type>` | `suggested*`, `new*` |
| **Original value** | `original*` | `<type>` | `old*`, `prev*` |
| **Target/Destination** | `target*` | `<type>` | `dest*`, `new*` |

### Naming Rationale

| Interface | Name | Rationale |
| --------- | ---- | --------- |
| `IFileNamer` | "Namer" | Transforms filenames according to conventions (kebab-case, etc.) |
| `IFileCategorizer` | "Categorizer" | Assigns files to categories based on rules |
| `IMetadataExtractor` | "Extractor" | Pulls metadata from files (EXIF, dimensions) |
| `IOperationPlanner` | "Planner" | Decides what operations to perform |
| `IOperationExecutor` | "Executor" | Performs the planned operations |
| `IDedupeHasher` | "Hasher" | Computes content hashes for comparison |
| `IScannedFile` | "Scanned" prefix | Represents a file after scanning with enriched data |
| `IFileOperation` | Noun form | Represents a planned or executed operation |

### Enum Value Conventions

| Enum | Values | Format | Rationale |
| ---- | ------ | ------ | --------- |
| `FileOperationType` | `MOVE`, `RENAME`, `MOVE_RENAME` | SCREAMING_SNAKE | Actions, verb-like |
| `LogLevel` | `DEBUG`, `INFO`, `WARN`, `ERROR` | SCREAMING_SNAKE | Standard log levels |
| `DedupeAction` | `SKIP`, `REPORT`, `REPLACE` | SCREAMING_SNAKE | Actions on duplicates |
| `DedupeMode` | `ALL`, `ANY` | SCREAMING_SNAKE | Boolean logic operators |
| `ConfigFormat` | `JSON`, `YAML` | SCREAMING_SNAKE | File format identifiers |

---

## Appendix B: Dedupe Strategy Summary

| Strategy | Interface | Priority | Use Case | Dependencies |
| -------- | --------- | -------- | -------- | ------------ |
| Name | `IDedupeStrategy` | 10 | Same filename | None |
| Size | `IDedupeStrategy` | 5 | Quick prefilter | `IFileSystem` |
| SHA-256 | `IDedupeStrategy` | 100 | Exact content match | `IDedupeHasher` |
| Image Dimensions | `IDedupeStrategy` | 50 | Same resolution images | `IMetadataExtractor` |
| EXIF | `IDedupeStrategy` | 60 | Same camera/timestamp | `IMetadataExtractor` |
| File Properties | `IDedupeStrategy` | 40 | Same timestamps | `IMetadataExtractor` |
| File Attributes | `IDedupeStrategy` | 30 | Same flags | `IMetadataExtractor` |

---

## Appendix C: Reuse Matrix

This matrix shows how the dedupe feature reuses existing and new infrastructure:

| Component | Reuses From | How |
| --------- | ----------- | --- |
| `IDedupeStrategy` | #2 Organizer Interfaces | Same interface pattern |
| `DedupeError` types | #5 Errors Module | Extends `IOrderlyError` |
| `IMAGE_EXTENSIONS` | #6 Constants Module | Import for dimension strategy |
| `IDedupeCommand` | #3 CLI Refactor | Extends `ICommand<DedupeOptions>` |
| `IScannedFile` | #2 Organizer Interfaces | Input to dedupe service |
| `IFileSystem` | Phase 1 Foundation | File operations abstraction |
| `ILogger` | Existing | Logging throughout dedupe |

---

*Document created: January 20, 2026*
*Last updated: January 20, 2026*
*Architecture: Interface-Driven Development (IDD)*
*Features: Core Improvements + De-duplication Module*
