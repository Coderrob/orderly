# Delete Empty Folders Feature Plan

## Goal

Add a feature that can "clean" a directory tree by removing empty folders safely and predictably.

The feature should:

- remove empty directories under a chosen root
- support preview mode before deletion
- avoid deleting the root directory itself
- avoid deleting directories that become non-empty between scan and delete
- integrate cleanly with the existing CLI, logging, and test structure

## Recommendation

Implement this as a dedicated CLI command:

```bash
orderly clean [directory]
```

with optional future reuse from `organize`.

Reasoning:

- `clean` is a distinct action from `organize`
- users can run it independently on existing directory trees
- it avoids overloading the `organize` command with more side effects
- the implementation can later be invoked after organization with a small wrapper

## Proposed CLI Behavior

### Primary Command

```bash
orderly clean [directory]
```

Default behavior:

- target directory defaults to `.`
- only empty directories below the target root are removed
- the target root itself is never removed

### Recommended Options

```bash
orderly clean [directory] [options]

--dry-run              Preview directories that would be removed
--include-hidden       Allow deleting empty hidden directories
--remove-orderly-dir   Allow deleting an empty .orderly directory
-l, --log-level <level>
-c, --config <path>
```

### Optional Future Option

```bash
orderly organize [directory] --clean-empty-dirs
```

This should be a later integration step, not part of the initial feature.

## Safety Rules

The implementation should enforce these rules:

1. Never delete the requested root directory.
2. Never follow directory symlinks.
3. Delete only directories confirmed empty at delete time.
4. Skip `.orderly` by default unless `--remove-orderly-dir` is set.
5. Skip hidden directories by default unless `--include-hidden` is set.
6. Treat permission failures as non-fatal per-directory errors and continue.
7. Process deepest directories first so parents that become empty can also be removed.

## Proposed Architecture

### New Modules

- `src/cleaner/empty-directory-cleaner.ts`
- `src/cleaner/interfaces.ts`
- `src/cleaner/index.ts`
- `src/cli/commands/clean.command.ts`

### Recommended Core Interface

```typescript
export interface ICleanOptions {
  dryRun?: boolean;
  includeHidden?: boolean;
  removeOrderlyDir?: boolean;
}

export interface IRemovedDirectory {
  path: string;
  dryRun: boolean;
}

export interface ICleanError {
  path: string;
  error: string;
}

export interface ICleanResult {
  scannedDirectories: number;
  removedDirectories: number;
  skippedDirectories: number;
  removed: IRemovedDirectory[];
  errors: ICleanError[];
}
```

### Recommended Service Shape

```typescript
export interface IEmptyDirectoryCleaner {
  clean(rootDirectory: string, options: Readonly<ICleanOptions>): ICleanResult;
}
```

## Implementation Phases

### Phase 1: Core Cleaner

Create a cleaner service that:

- resolves the root path
- discovers candidate directories recursively
- sorts candidates by depth descending
- checks emptiness immediately before deletion
- deletes with `fs.rmdirSync` or equivalent empty-directory-only API
- returns a structured result for CLI output and tests

Recommended helpers:

- `collectDirectories(rootDirectory)`
- `isHiddenDirectory(directoryName)`
- `shouldSkipDirectory(directoryPath, options)`
- `isDirectoryEmpty(directoryPath)`
- `removeDirectoryIfEmpty(directoryPath, options)`

Implementation note:

Use a bottom-up traversal or sort by path depth descending. This is required so:

- `root/a/b` can be deleted first
- then `root/a` can also be deleted if it becomes empty

### Phase 2: CLI Command

Add a `clean` command using the same command-handler pattern already used by `init`, `scan`, and `organize`.

Recommended files:

- `src/cli/commands/clean.command.ts`
- `src/cli/commands/clean.command.test.ts`
- `src/cli/commands/index.ts`

CLI responsibilities:

- validate the target directory
- create the logger
- invoke the cleaner
- format a concise success message
- log per-directory failures without aborting the entire clean run

### Phase 3: Output and UX

Add clear user-facing output:

- number of directories scanned
- number removed
- number skipped
- dry-run preview list when `--dry-run` is enabled

Example success output:

```text
Scanned 42 directories
Removed 8 empty directories
Skipped 3 directories
```

Example dry-run output:

```text
Dry run: 8 empty directories would be removed
  /photos/2021/tmp
  /photos/2021/cache
```

### Phase 4: Tests

Add coverage in the existing behavioral style.

#### Unit Tests

Create tests for:

- empty leaf directory is removed
- nested empty parents are removed bottom-up
- non-empty directories are preserved
- root directory is preserved even when empty
- hidden directories are skipped by default
- hidden directories are removed when enabled
- empty `.orderly` directory is skipped by default
- empty `.orderly` directory is removed when enabled
- dry-run reports directories without deleting them
- permission or race-condition failures are reported and do not abort the run
- symlink directories are ignored

#### CLI Tests

Create tests for:

- `clean` command success
- `clean --dry-run`
- invalid directory path
- logging and exit behavior when some deletions fail

#### Integration Tests

Add end-to-end tests under `__tests__/integration` for:

- cleaning a tree with nested empty folders
- cleaning after an organize run
- preserving directories that contain files added during execution

### Phase 5: Optional Organize Integration

After the standalone command is stable, consider:

```bash
orderly organize [directory] --clean-empty-dirs
```

Recommended behavior:

- run organization first
- clean only after operation execution succeeds
- do not run clean during `organize --dry-run`
- default to cleaning only under the original source root, not the configured output root unless explicitly requested

## File and Code Changes

### Likely Source Changes

- `src/cli/interfaces.ts`
- `src/cli/constants.ts`
- `src/cli/commands/index.ts`
- `src/cli/services/index.ts` if a separate cleaner service is exposed there
- `src/index.ts` and related barrel exports if the cleaner is public

### Likely Test Changes

- `src/cli/commands/clean.command.test.ts`
- `__tests__/integration/cli.integration.test.ts`
- `__tests__/integration/organize.integration.test.ts`

## Edge Cases

The plan should explicitly handle:

- directories that become non-empty after they were discovered
- directories deleted by another process before removal
- permission denied errors
- Windows path behavior
- hidden folders on Unix-style names
- empty category folders left behind after `organize`
- empty output folders that should not be deleted if outside the requested root

## Open Design Decisions

These should be settled before implementation starts:

1. Should hidden directories be included by default?
   Recommendation: no.

2. Should `.orderly` ever be removed automatically?
   Recommendation: no, unless explicitly enabled.

3. Should the feature be available only as `clean`, or also as an `organize` flag?
   Recommendation: standalone command first, integration second.

4. Should config support this feature?
   Recommendation: add CLI support first; add config only if repeated usage justifies it.

## Suggested Delivery Order

1. Implement `cleaner` core service and unit tests.
2. Add `clean` CLI command and command tests.
3. Add integration tests.
4. Document the command in `README.md`.
5. Optionally add `organize --clean-empty-dirs`.

## Verification Checklist

Before merging:

- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm test -- --runInBand src/cli/commands/clean.command.test.ts`
- `npm test -- --runInBand __tests__/integration/cli.integration.test.ts`
- `npm test -- --runInBand __tests__/integration/organize.integration.test.ts`

## Success Criteria

The feature is complete when:

- users can run `orderly clean [directory]`
- dry-run previews are accurate
- only empty directories are removed
- the root directory is never removed
- hidden and `.orderly` behavior is explicit and tested
- failures are reported without aborting the full clean pass
- the feature passes existing repository quality gates
