# Orderly Limitations

This file tracks current, known constraints in Orderly behavior.

## Scope

The items below focus on user-facing runtime behavior and engineering constraints that are not fully solved yet.

## Current Limitations

### 1) Scan depth is always recursive

Status: Open

Current behavior:

- Scanning traverses nested directories recursively.
- There is no first-class non-recursive mode in CLI commands.
- There is no max-depth option in scan/organize/watch.

Impact:

- Larger trees may increase runtime and memory use.
- Users cannot easily limit work to root-level files only.

Potential direction:

- Add scanning options for recursive false and maxDepth.

### 2) No extension pre-filter during discovery

Status: Open

Current behavior:

- File discovery gathers all files first.
- Categorization determines how files are handled afterward.
- There is no dedicated includeExtensions or excludeExtensions scan filter.

Impact:

- More files are loaded and evaluated than necessary in mixed-content trees.

Potential direction:

- Add configurable scan-time include/exclude extension filters.

### 3) Watch mode is polling-based only

Status: Open

Current behavior:

- Watch runs organize cycles on a polling interval.
- No native file-system event mode is available.

Impact:

- Polling can introduce delay and extra repeated scans.
- Resource usage may be higher than event-driven watch on large trees.

Potential direction:

- Add optional FS-event watch mode while keeping polling as fallback.

### 4) Revert is manifest-based and conservative

Status: Partially Mitigated

Current behavior:

- Revert only processes entries marked successful in the manifest.
- Revert skips when source is missing.
- Revert skips when destination already exists (to avoid overwrite).
- There is no force-overwrite option.

Impact:

- Conflicting destinations require manual intervention.
- Partial restore outcomes are possible and expected in real-world cleanup scenarios.

Potential direction:

- Add explicit force mode with strong confirmation and detailed reporting.

### 5) No transactional rollback across a full run

Status: Open

Current behavior:

- Operations are applied per file.
- Failures are reported, but there is no all-or-nothing transaction boundary.

Impact:

- Mixed success/failure outcomes can leave partially applied state.

Potential direction:

- Add optional staged execution with best-effort rollback semantics.

### 6) Cross-device move semantics depend on platform

Status: Open

Current behavior:

- Move/rename behavior relies on platform file system semantics.
- Cross-device scenarios may fail depending on environment and operation path.

Impact:

- Some moves may fail in containerized, network, or mounted-drive setups.

Potential direction:

- Add fallback copy+verify+delete flow for cross-device moves.

## Out of Date Items Removed

This document previously listed several items as limitations that are now implemented, including custom output directory support. Those stale sections have been removed.

## Related Docs

- README.md
- AGENTS.md
- CHANGELOG.md
- **tests**/README.md

Last updated: March 25, 2026
Document version: 2.0
