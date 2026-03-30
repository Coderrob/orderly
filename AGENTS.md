# Agent Expectations for Orderly Repository

This document defines the required standards for AI agents and automated contributors working in the Orderly repository. Orderly is a TypeScript CLI for file organization, so changes must favor correctness, safety, maintainability, and predictable behavior.

## Core Principles

- Quality first: every change must pass repository validation before handoff.
- Test-driven changes: behavior changes require test coverage for the changed path.
- Type safety: keep strict TypeScript guarantees and avoid `any`.
- Documentation consistency: update docs and JSDoc when public behavior changes.
- Small safe steps: prefer narrow, reviewable changes over broad rewrites.

## Code Quality Standards

### TypeScript Requirements

- Strict mode must remain enabled.
- Avoid `any`; prefer precise types, unions, generics, and type guards.
- Define interfaces for shared contracts and data structures.
- Keep runtime validation aligned with static types.
- Prefer immutable inputs and readonly types when practical.

### Code Style

- All code must pass ESLint with `npm run lint`.
- Formatting must pass Prettier checks with `npm run format:check`.
- Follow repository naming conventions:
  - Files: `kebab-case.ts`
  - Classes: `PascalCase`
  - Methods and properties: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Interfaces: `PascalCase` with `I` prefix where that pattern is already established

### File Organization

```text
src/
├── cli/           # Command-line interface
├── config/        # Configuration management
├── constants/     # Application constants
├── dedupe/        # File deduplication logic
├── errors/        # Custom error classes
├── logger/        # Logging functionality
├── organizer/     # File organization logic
├── scanner/       # File scanning utilities
├── types/         # TypeScript type definitions
└── utils/         # Shared utilities
```

## Refactoring Expectations

- Prefer refactorings that preserve behavior and are backed by tests.
- Use small refactoring patterns:
  - Extract function for repeated or branch-heavy logic.
  - Introduce parameter object when argument lists become hard to follow.
  - Replace magic values with named constants.
  - Consolidate duplicate conditionals and duplicate parsing logic.
  - Move shared low-level logic into focused helpers when multiple modules depend on it.
- Preserve public APIs unless the task explicitly calls for a breaking change.
- When refactoring behavior-critical code, add or update regression tests first or alongside the change.

## Design Pattern Expectations

- Prefer established patterns already present in the repo over inventing new abstractions.
- Use strategy pattern for pluggable dedupe behavior and comparison logic.
- Use factory helpers for constructing command or dedupe services when that keeps wiring centralized.
- Use small adapter/wrapper helpers for filesystem, clock, and external side effects to keep tests isolated.
- Favor composition over inheritance unless an existing class hierarchy clearly requires inheritance.
- Keep helpers single-purpose; avoid turning utility files into grab-bags.

## CLI Wrapping Standard

- Production command handlers should prefer plain wrapper composition through command helper modules such as `src/cli/commands/command-wrapper.helpers.ts`.
- Method decorators remain compatibility adapters over the same middleware/wrapper behavior and should not be the default for new production command handlers.
- Preserve the established cross-cutting order for command execution:
  1. auto-config or context resolution when applicable
  2. error handling
  3. telemetry
  4. optional audit
- When adding a new command, prefer constructor-built wrapped `execute` functions over adding new decorator-based handler methods.

## Testing Requirements

### Coverage Targets

- Minimum statement coverage: 95%
- Minimum branch coverage: 90%
- Minimum function coverage: 95%
- Minimum line coverage: 95%

### Test Expectations

- Name test files `*.test.ts` or `*.spec.ts`.
- Group related behavior in `describe` blocks.
- Cover happy paths, failures, and edge conditions.
- Mock external dependencies and side effects appropriately.
- Add integration coverage when workflows cross module boundaries.
- Add regression tests for bug fixes and parser boundary conditions.

## Documentation Standards

### Code Documentation

- Public APIs should have JSDoc.
- Document non-obvious parameters, return values, and thrown errors.
- Keep comments factual and concise.
- Remove stale comments during refactors.

### Repository Documentation

- Update `README.md` when user-facing features or workflows change.
- Keep configuration examples current.
- Document any new validation or development commands.

## Validation Workflow

All substantive changes should pass `npm run verify`, which must cover:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run format:check`
4. `npm run test:coverage`
5. `npm run duplication:check`

Use `npm run quality` for the lint, format, and coverage gate:

1. `npm run lint`
2. `npm run format:check`
3. `npm run test:coverage`

Keep `package.json` scripts aligned with typical open-source expectations:

- Prefer stable contributor-facing commands such as `build`, `test`, `lint`, `format`, `typecheck`, and `verify`.
- Avoid adding one-off maintenance aliases for dependency updates, local environment setup, or ad hoc wrappers unless they are required by CI or documented contributor workflows.
- Remove redundant script aliases when one script is only a thin indirection over a single command and does not improve contributor ergonomics.

## Security and Safety

- Validate and sanitize user-controlled inputs.
- Prevent path traversal and unsafe file operations.
- Avoid exposing sensitive information in logs or errors.
- Use custom errors and clear user-facing failure messages where appropriate.
- Prefer safe wrappers around destructive filesystem operations.

## Agent-Specific Working Rules

- Match existing patterns before introducing new structure.
- Keep imports organized and minimal.
- Do not bypass failing validation with comment directives unless explicitly requested.
- Do not remove tests to make validation pass.
- If a refactor changes control flow, ensure tests still prove the same behavior.
- If validation scripts are incomplete or inconsistent with documented standards, fix the scripts as part of the task.

## Verification Checklist

Before handing off changes, ensure:

- [ ] `npm run verify` passes
- [ ] Coverage remains at or above the repository thresholds
- [ ] Lint and format checks pass
- [ ] Tests cover the changed behavior
- [ ] Documentation is updated when needed
- [ ] Refactoring preserves intended behavior
