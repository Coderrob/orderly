# CLI Command Structure Refactor Plan

## Objective

Refactor the CLI into a single, coherent command tree with one composition path, consistent option handling, and clear ownership of:

- root command definition
- command groups and subcommands
- shared arguments and options
- command execution handlers
- CLI result rendering and exit behavior

The immediate goal is structural consolidation, not a feature expansion.

## Current Problems

### 1. Two CLI Architectures Exist in Parallel

The repository currently has:

- a direct Commander-based CLI in `src/cli/cli.service.ts`
- a handler-based command layer in `src/cli/commands/*.command.ts`

The public entrypoint still executes `CliService`, so the newer handler layer is not the real runtime surface.

### 2. CLI Surface and Handler Capabilities Drift

The handler interfaces and implementations support more behavior than the wired CLI exposes. This increases the risk of:

- undocumented options
- dead code paths
- test coverage that does not reflect the public CLI

### 3. No Single Command Tree Composition Point

Command registration is embedded in `CliService`, while reusable handlers live elsewhere. That makes future additions like `clean` harder than necessary.

### 4. Shared Options Are Duplicated

Directory-oriented commands repeat common options and argument conventions instead of defining them once.

## Target Architecture

Adopt one CLI architecture only:

- Commander builds the command tree
- handlers execute business behavior
- services provide reusable dependencies
- root composition happens in exactly one place

## Proposed Command Hierarchy

### Canonical Structure

```text
orderly
  files
    scan [directory]
    organize [directory]
    clean [directory]
  config
    init
```

### Backward-Compatible Aliases

Keep these root aliases during migration:

```text
orderly scan [directory]
orderly organize [directory]
orderly init
```

These aliases should delegate to the canonical grouped commands.

### Why This Hierarchy

- `files` groups operations on directory contents
- `config` groups configuration lifecycle commands
- future additions have an obvious location
- command help becomes more navigable as the CLI grows

## Refactor Principles

1. One runtime composition path.
2. One source of truth for each command’s arguments and options.
3. Handlers should not know Commander details.
4. Entry point should only construct and run the root CLI.
5. Alias support should be explicit and thin.
6. Existing user behavior should stay stable unless intentionally changed.

## Proposed Module Layout

### New Files

- `src/cli/root-command.ts`
- `src/cli/command-groups/files.command-group.ts`
- `src/cli/command-groups/config.command-group.ts`
- `src/cli/options/shared-options.ts`
- `src/cli/options/shared-arguments.ts`
- `src/cli/result/command-result-runner.ts`

### Existing Files to Keep

- `src/cli/commands/init.command.ts`
- `src/cli/commands/scan.command.ts`
- `src/cli/commands/organize.command.ts`
- `src/cli/services/*.ts`
- `src/cli/decorators/*.ts`

### Existing Files to Shrink or Remove

- `src/cli/cli.service.ts`
- `src/cli/cli.service.helpers.ts`

Recommendation:

- remove `CliService` after migration
- move any remaining useful helper behavior into focused modules

## Responsibility Split

### Root Command Builder

`src/cli/root-command.ts`

Responsibilities:

- create the top-level `Command`
- apply name, description, version, and help settings
- register grouped commands
- register temporary aliases
- expose a `createRootCommand()` factory

### Command Groups

`files.command-group.ts`

Responsibilities:

- create the `files` command
- attach `scan`, `organize`, and `clean`
- define shared directory command conventions

`config.command-group.ts`

Responsibilities:

- create the `config` command
- attach `init`

### Command Definitions

Each command-definition module should:

- define Commander arguments and options
- inject the correct handler
- call a shared result runner

Handlers should remain focused on business execution.

### Shared Option Modules

`shared-options.ts`

Responsibilities:

- define reusable option builders for:
  - `--config`
  - `--log-level`
  - `--no-auto-config`
  - `--dry-run`
  - `--manifest`

`shared-arguments.ts`

Responsibilities:

- define reusable directory argument registration

### Result Runner

`command-result-runner.ts`

Responsibilities:

- execute handler methods
- print `message` when present
- set `process.exitCode`
- avoid direct `process.exit()` in normal success/failure flows

This should centralize CLI-facing result behavior.

## Command Contract Standardization

Standardize handler signatures.

### Preferred Shape

```typescript
interface ICommandHandler<TOptions> {
  execute(directory: string, options: Readonly<TOptions>): Promise<ICommandResult>;
}
```

For commands without a directory:

```typescript
interface IInitHandler {
  execute(options: Readonly<IInitOptions>): Promise<ICommandResult>;
}
```

### Recommendation

Keep the current handler execution shape, but make Commander wiring responsible for adapting positional arguments to handlers.

## Option Normalization Plan

### Shared Directory Command Options

Apply the same conventions to `scan`, `organize`, and `clean`:

- `[directory]` with default `.`
- `-c, --config <path>`
- `-l, --log-level <level>`
- `--no-auto-config`

### Organize-Specific Options

- `-d, --dry-run`
- `--manifest` or `--no-manifest`
- `-o, --output <path>`
- dedupe options once they are formally exposed

### Init-Specific Options

- `-f, --format <format>`

### Important Cleanup

The public CLI must either:

- expose `dedupe` / `dedupeAction`, or
- remove them from the current command interfaces until officially supported

Do not leave them half-implemented.

## Migration Phases

### Phase 1: Freeze the Public Contract

Decide and document:

- canonical grouped commands
- backward-compatible root aliases
- final option list for each command

Deliverables:

- command matrix
- final help text

### Phase 2: Introduce Root Builder

Create:

- `src/cli/root-command.ts`
- command group modules

Wire:

- `files scan`
- `files organize`
- `config init`

Do not remove old entry logic yet.

### Phase 3: Move Commander Wiring Out of `CliService`

Extract all Commander setup from `CliService` into the new command-definition modules.

`CliService` should not remain the place that defines the public CLI tree.

### Phase 4: Connect Handlers to the Real Runtime

Instantiate:

- `ConfigService`
- `DirectoryValidator`
- `ManifestService`
- `InitHandler`
- `ScanHandler`
- `OrganizeHandler`

Bind those handlers into the new command tree.

At the end of this phase, `src/cli.ts` should call:

```typescript
createRootCommand().parse();
```

### Phase 5: Add Result Runner

Introduce a shared execution adapter so all commands:

- render results consistently
- set exit codes consistently
- avoid duplicate message printing logic

### Phase 6: Add Backward-Compatible Aliases

Temporarily support:

- `orderly scan`
- `orderly organize`
- `orderly init`

Internally these should delegate to the canonical command definitions, not duplicate logic.

### Phase 7: Remove `CliService`

Once the new root command is fully active and tested:

- delete `src/cli/cli.service.ts`
- delete or relocate `src/cli/cli.service.helpers.ts`
- update exports and tests accordingly

## Detailed File Plan

### Entry Point

Update:

- `src/cli.ts`

Change:

- stop constructing `CliService`
- construct root command via new builder

### CLI Index Exports

Update:

- `src/cli/index.ts`

Add exports for:

- root command builder
- command groups if intentionally public

### Interfaces

Update:

- `src/cli/interfaces.ts`

Tasks:

- align option interfaces with the actual public CLI
- add any command-definition-specific interfaces only if needed

### Constants

Update:

- `src/cli/constants.ts`

Tasks:

- add command names and group names if useful
- centralize help labels where it improves consistency

### Command Tests

Update or add:

- `src/cli/commands/init.command.test.ts`
- `src/cli/commands/scan.command.test.ts`
- `src/cli/commands/organize.command.test.ts`
- `src/cli/root-command.test.ts`
- `src/cli/command-groups/*.test.ts`

### Integration Tests

Update:

- `__tests__/integration/cli.integration.test.ts`

Add coverage for:

- canonical grouped commands
- backward-compatible aliases
- help output structure

## Command Matrix to Implement

### Config Group

```text
orderly config init --format yaml
```

Alias:

```text
orderly init --format yaml
```

### Files Group

```text
orderly files scan [directory]
orderly files organize [directory]
orderly files clean [directory]
```

Aliases during migration:

```text
orderly scan [directory]
orderly organize [directory]
```

## Open Decisions to Resolve Early

1. Should aliases remain permanently or be deprecated later?
   Recommendation: keep for at least one minor release.

2. Should `init` remain root-level permanently?
   Recommendation: keep alias only; canonical home should be `config init`.

3. Should `clean` launch directly under `files` only, or also as a root alias?
   Recommendation: grouped only at first, add alias only if user demand justifies it.

4. Should dedupe options be public in this refactor?
   Recommendation: either fully wire them now or remove them from public option interfaces until ready.

## Risks

### 1. Behavioral Drift During Migration

Risk:

- help text changes unexpectedly
- option parsing behavior changes subtly

Mitigation:

- capture current behavior in CLI integration tests before refactor

### 2. Alias Duplication

Risk:

- grouped commands and aliases diverge

Mitigation:

- aliases should forward to the same definition function, not re-declare options

### 3. Handler/CLI Drift Continues

Risk:

- handlers evolve separately from public commands again

Mitigation:

- define command options in one module per command and keep handler options sourced from that contract

## Testing Plan

### Unit Tests

Add tests for:

- root builder creates expected groups
- shared options are attached consistently
- aliases point to the same behavior
- result runner sets exit code and message correctly

### Integration Tests

Add or update tests for:

- `orderly --help`
- `orderly files --help`
- `orderly files scan --help`
- `orderly files organize --help`
- `orderly config init --help`
- `orderly scan` alias
- `orderly organize` alias
- `orderly init` alias

### Regression Tests

Preserve current behavior for:

- default directory argument
- invalid directory handling
- config autodiscovery behavior
- dry-run behavior
- manifest behavior

## Implementation Order

1. Add tests that lock current CLI behavior where still valid.
2. Implement `root-command.ts`.
3. Implement command groups.
4. Implement shared argument/option builders.
5. Wire existing handlers into the new tree.
6. Add aliases.
7. Switch `src/cli.ts` to the new root builder.
8. Remove `CliService`.
9. Clean up exports and obsolete tests.

## Definition of Done

The refactor is complete when:

- there is exactly one runtime command tree builder
- `src/cli.ts` no longer references `CliService`
- grouped commands are the canonical structure
- aliases work without duplicating logic
- handler interfaces match the real public command surface
- help output is coherent and hierarchical
- all CLI tests pass
- `npm run typecheck`, `npm run lint`, and relevant tests pass
