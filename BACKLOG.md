# Backlog

## Purpose

This document is the single planning backlog for Orderly architecture, refactoring, and technical improvement work. It replaces the old design-oriented `improvements.md` and the task-ledger `refactoring-plan.md`.

It is intended to answer:

- what architectural problems exist
- what the target direction is
- what work has already been completed
- what work remains
- what order the remaining work should happen in
- how each task should be validated

This backlog assumes the current goal is behavior-preserving improvement. Any intentional user-facing behavior change should be tracked separately.

## Current State Summary

Orderly already has several strengths:

- clear high-level module boundaries under `src/`
- strong automated validation and test coverage
- good use of side-effect wrappers such as filesystem and clock helpers
- a reasonable strategy model for dedupe behavior

The main improvement opportunities are:

- some command paths still carry more composition complexity than necessary
- service construction and cross-cutting composition can still be simplified further
- dedupe is substantially cleaner than before, but its end-state bucketed model is not finished
- documentation should reflect the current refactoring model more clearly

## Goals

- keep CLI behavior and configuration stable
- reduce orchestration complexity in command handlers and services
- improve dedupe scalability for large scans
- standardize service construction and dependency ownership
- make future feature work cheaper and lower-risk
- preserve testability and repository quality standards

## Non-Goals

- no rewrite of the CLI framework
- no breaking change to the public command surface
- no plugin architecture in this phase
- no output-format changes unless explicitly required by a later task

## Design Principles

- prefer small, behavior-preserving refactors
- separate orchestration from domain logic
- keep side effects at the edges
- use mutable internals only where they reduce cost, while keeping readonly public boundaries
- consolidate duplicated low-level logic into focused helpers

## Status Legend

- `Completed`: implemented and validated
- `In Progress`: partially implemented or established by new primitives, but not yet applied consistently
- `Pending`: not yet started
- `Deferred`: intentionally postponed because it is lower value or depends on a larger change

## Validation Standard

Every completed task should pass:

- `npm run lint`
- `npm run typecheck`
- targeted tests for the changed path

Milestone and release-level validation should additionally pass:

- `npm run format:check`
- `npm run test:coverage`
- `npm run duplication:check`
- `npm run verify`

## Completed Work

### CLI Composition And Workflow Separation

Status: `Completed`

Tasks completed:

- extract explicit CLI composition root
- introduce root workflow creation
- separate workflow orchestration from handlers for:
  - organize
  - dedupe
  - scan
- add shared runtime services for dedupe workflow coordination
- add shared workflow file-operation helper
- extract organize-specific dedupe collaborator

Representative files:

- `src/cli/composition-root.ts`
- `src/cli/root-command.ts`
- `src/cli/services/organize-workflow.service.ts`
- `src/cli/services/dedupe-workflow.service.ts`
- `src/cli/services/scan-workflow.service.ts`
- `src/cli/services/dedupe-runtime.service.ts`
- `src/cli/services/organize-dedupe.service.ts`
- `src/cli/services/workflow-file-operations.ts`

### Organizer Collision Resolution

Status: `Completed`

Tasks completed:

- extract collision policy out of operation execution
- isolate collision behavior behind `CollisionResolver`

Representative files:

- `src/organizer/collision-resolver.ts`
- `src/organizer/operation-executor.ts`
- `src/organizer/interfaces.ts`

### Dedupe Structural Cleanup

Status: `Completed`

Tasks completed:

- reduce repeated immutable rebuild patterns in selected hot paths
- make dedupe strategy registration more declarative
- reduce dedupe candidate generation overhead from full global pair enumeration
- extract candidate-pair generation helper
- extract pair-grouping helper
- extract pair-evaluation helper module
- extract strategy-execution helper module
- extract group-resolution helper module
- extract matched path-pair aggregation helper module
- extract resolved path-pair evaluation helper module
- split `ANY` and current `ALL` grouping paths into dedicated helpers
- extract duplicate-pair-evaluation creation into its own helper module
- rename broad helper modules to domain-specific names
- split shared dedupe helper logic into smaller modules

Representative files:

- `src/dedupe/dedupe-factory.ts`
- `src/dedupe/dedupe-service.ts`
- `src/dedupe/dedupe-all-grouping.ts`
- `src/dedupe/dedupe-any-grouping.ts`
- `src/dedupe/dedupe-candidate-pairs.ts`
- `src/dedupe/dedupe-duplicate-pair-evaluations.ts`
- `src/dedupe/dedupe-group-resolution.ts`
- `src/dedupe/dedupe-grouping.ts`
- `src/dedupe/dedupe-pair-evaluation.ts`
- `src/dedupe/dedupe-path-pair-matches.ts`
- `src/dedupe/dedupe-resolved-pair-evaluation.ts`
- `src/dedupe/dedupe-strategy-execution.ts`
- `src/dedupe/dedupe-analysis.helpers.ts`

### JPEG And Metadata Tightening

Status: `Completed`

Tasks completed:

- tighten JPEG marker scanning and parser boundary handling
- centralize low-level JPEG structure helpers
- add direct low-level regression coverage

Representative files:

- `src/dedupe/metadata/jpeg-structure.ts`
- `src/dedupe/metadata/image-parsers.ts`
- `src/dedupe/metadata/jpeg-exif-parser.ts`
- `src/dedupe/metadata/*.test.ts`

### Public Barrel And Export Cleanup

Status: `Completed`

Tasks completed:

- tighten CLI barrel exports
- tighten package root barrel exports
- add direct barrel smoke coverage

Representative files:

- `src/cli/index.ts`
- `src/index.ts`
- `src/cli/index.test.ts`
- `src/index.test.ts`

### Multi-Argument Command Wrapper Migration

Status: `Completed`

Tasks completed:

- extend shared command wrapper helpers to support:
  - `execute(directory, options)`
  - `execute(directory, options, context?)`
- add plain auto-config context creation support for wrapper-based execution
- migrate multi-argument command handlers off decorators:
  - `scan`
  - `clean`
  - `watch`
  - `dedupe`
  - `organize`

Representative files:

- `src/cli/commands/command-wrapper.helpers.ts`
- `src/cli/decorators/auto-config-discovery.decorator.ts`
- `src/cli/commands/scan.command.ts`
- `src/cli/commands/clean.command.ts`
- `src/cli/commands/watch.command.ts`
- `src/cli/commands/dedupe.command.ts`
- `src/cli/commands/organize.command.ts`

## In-Progress Work

### Command Decorator To Wrapper Migration

Status: `Completed`

Completed subtasks:

- extract generic method-wrapper helper layer
- extract command-specific and CLI-action-specific wrapper helpers
- convert command decorators to shared middleware-style primitives
- add plain wrapper support for:
  - error handling
  - telemetry
  - audit
- add plain wrapper support for:
  - multi-argument command handlers
  - auto-config context creation
- introduce shared single-options command wrapper helpers
- migrate single-options commands off decorators:
  - config-validate
  - revert
  - init
- migrate multi-argument commands off decorators:
  - scan
  - clean
  - watch
  - dedupe
  - organize

Representative files:

- `src/cli/decorators/method-decorator.helpers.ts`
- `src/cli/decorators/command-decorator.helpers.ts`
- `src/cli/decorators/cli-action-decorator.helpers.ts`
- `src/cli/decorators/command-error-handler.decorator.ts`
- `src/cli/decorators/command-telemetry.decorator.ts`
- `src/cli/decorators/command-audit.decorator.ts`
- `src/cli/commands/command-wrapper.helpers.ts`
- `src/cli/commands/config-validate.command.ts`
- `src/cli/commands/revert.command.ts`
- `src/cli/commands/init.command.ts`
- `src/cli/commands/scan.command.ts`
- `src/cli/commands/clean.command.ts`
- `src/cli/commands/watch.command.ts`
- `src/cli/commands/dedupe.command.ts`
- `src/cli/commands/organize.command.ts`

Remaining subtasks:

- decorators remain compatibility wrappers over plain wrapper composition
- plain wrapper composition in command helpers is the default pattern for production command handlers
- remaining cleanup is documentation and optional future surface reduction, not architectural uncertainty

### Dedupe Algorithm End-State Refactor

Status: `In Progress`

Problem:

- candidate-pair reduction is improved, but the design still has more orchestration and pair logic than the target bucketed model

Tasks:

- move from pair-oriented orchestration to strategy-bucket-driven group construction
- route `ANY` mode through direct bucket-driven grouping
- build duplicate-pair evaluations from aggregated bucket matches instead of recomputing strategy equality per candidate pair
- keep `ALL` mode on the current duplicate-pair-evaluation path until the bucketed narrowing model is defined
- keep the current `ALL` grouping semantics intact while the collaborator split is completed
- reduce cross-strategy pair materialization where possible
- benchmark representative large-file scenarios
- confirm no regression in duplicate grouping semantics

Validation:

- existing dedupe test suite
- targeted new tests for:
  - overlapping strategy buckets
  - empty buckets
  - `ANY` mode grouping
  - `ALL` mode narrowing
- before/after benchmark or fixture comparison

## Pending Work

### Finish Command Middleware Migration

Status: `Completed`

Tasks:

- final architecture decision: decorators are compatibility wrappers over middleware/plain wrapper composition
- production command handlers should prefer `command-wrapper.helpers.ts` and related plain wrapper helpers
- decorator helpers remain available for compatibility and focused tests
- supported cross-cutting order is:
  - auto-config/context resolution when applicable
  - error handling
  - telemetry
  - optional audit
- any further public-surface reduction is optional follow-up work, not a blocker

Validation:

- full decorator and command wrapper test suites
- root command registration smoke tests

### Package And CLI Documentation Alignment

Status: `Pending`

Tasks:

- document the refactoring approach for command wrappers as the current standard
- add or update contributor notes if decorators become legacy compatibility paths
- keep this backlog aligned with completed work

Validation:

- docs review
- verify any documented commands still exist in `package.json`

## Deferred Work

### Benchmark Harness For Dedupe

Status: `Deferred`

Reason:

- useful, but lower priority than finishing correctness-preserving architecture cleanup

Future tasks:

- add representative directory fixtures
- measure pair-oriented and bucket-oriented dedupe flows
- document performance baselines

### Further Metadata Parser Abstraction

Status: `Deferred`

Reason:

- low-level metadata parsing is already materially safer than before
- additional abstraction should wait until there is another real parser family to justify it

## Recommended Execution Order

1. Finish command middleware migration decisions
2. Complete dedupe algorithm end-state refactor
3. Refresh architecture and contributor documentation
4. Add dedupe benchmark coverage

## Task Checklist

### Immediate Next Tasks

- [ ] Define the bucket-driven end-state for `ALL` dedupe grouping

### Medium-Term Tasks

- [ ] Benchmark dedupe behavior on larger fixtures
- [ ] Keep this backlog aligned with completed work

## Success Criteria

This improvement effort should be considered complete when:

- all command handlers use a consistent wrapper composition model
- decorator usage is either removed from handlers or clearly demoted to compatibility helpers
- auto-config discovery is available without depending on descriptor decorators
- large dedupe scans no longer depend on the old comparison-oriented architecture
- helper modules reflect real domain boundaries
- `npm run verify` remains green throughout
