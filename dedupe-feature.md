# De-duplication Feature (Planning + Implementation Guidance)

## Goals
- Detect and optionally remove duplicate files based on configurable strategies.
- Support recursive checks across nested directories.
- Keep existing behavior by default; dedupe runs only when enabled in config/CLI.
- Follow Liskov substitution: every class has a corresponding interface, and concrete implementations can be substituted without changing client behavior.

## Scope
- Dedupe operates on scanned files before move/rename operations are executed.
- Dedupe can be used to skip duplicates, replace duplicates, or emit a report (choose via config).

## Strategies
Each strategy produces a comparable key. Strategies can be combined (AND) to reduce false positives.

1) File name
- Key: normalized filename only (case-folded, optionally remove extension).
- Use when duplicates are most likely identical by name.
- Risk: false positives for unrelated files with same name.

2) File size
- Key: byte length from fs stat.
- Use as quick prefilter.
- Risk: collisions for same-size different content.

3) Image dimensions
- Key: width x height from metadata (only for supported image formats).
- Use with size/name to reduce false positives.
- Risk: different images can share dimensions.

4) SHA-256 thumbprint
- Key: sha256 hash of file contents.
- Strongest match; can be slow on large files.
- Use after prefilters (size) for performance.

5) File properties (file info)
- Key: creation/modification timestamps, owner, and mime/type where available.
- Use to improve confidence with weak strategies.
- Risk: timestamps can vary; not portable across platforms.

6) File attributes
- Key: readonly/hidden/system flags or platform-specific attributes.
- Use as optional supplemental check.
- Risk: not stable across copies.

7) EXIF
- Key: camera make/model, capture timestamp, lens, etc.
- Use for photo libraries.
- Risk: missing or stripped EXIF data.

## Strategy composition
- Provide a list of strategies in priority order.
- Dedupe decision is:
  - Pre-filter with size (if enabled) to limit comparisons.
  - Then verify with a strong match (sha256) if configured.
  - When multiple strategies are enabled, treat as AND by default.
  - Optionally support OR mode for exploratory reports.

## Recursive scan behavior
- `recursive: boolean` option controls scanning subdirectories.
- If false, only the top-level directory is scanned.
- If true, use glob patterns (already in FileScanner) with proper ignore rules.

## Configuration (proposal)
Add to `OrderlyConfig`:

- `dedupeEnabled: boolean` (default: false)
- `dedupeRecursive: boolean` (default: true)
- `dedupeStrategy: {
    mode: 'all' | 'any',
    name?: { caseSensitive: boolean; ignoreExtension: boolean },
    size?: boolean,
    imageDimensions?: boolean,
    sha256?: boolean,
    fileProperties?: boolean,
    fileAttributes?: boolean,
    exif?: boolean
  }`
- `dedupeAction: 'skip' | 'report' | 'replace'`

## Interfaces (LSP compliant)
Define interfaces for all dedupe components so callers depend on abstractions.

- `IDedupeService`
  - `findDuplicates(files: ScannedFile[]): DedupeResult`
  - `applyAction(result: DedupeResult, action: DedupeAction): DedupeOutcome`

- `IDedupeStrategy`
  - `name: string`
  - `supports(file: ScannedFile): boolean`
  - `getKey(file: ScannedFile): Promise<string | null>`

- `IDedupeHasher`
  - `sha256(filePath: string): Promise<string>`

- `IDedupeMetadataReader`
  - `getImageDimensions(filePath: string): Promise<{ width: number; height: number } | null>`
  - `getExif(filePath: string): Promise<Record<string, string> | null>`
  - `getFileProperties(filePath: string): Promise<Record<string, string> | null>`
  - `getFileAttributes(filePath: string): Promise<Record<string, string> | null>`

Concrete implementations should implement these interfaces so they can be swapped (e.g., node-based vs. native) without breaking consumers.

## Data model (proposal)
- `DedupeKey`: string
- `DedupeCandidate`: { file: ScannedFile; key: DedupeKey; strategy: string }
- `DuplicateGroup`: { key: DedupeKey; files: ScannedFile[] }
- `DedupeResult`: { groups: DuplicateGroup[]; totalFiles: number; totalDuplicates: number }
- `DedupeOutcome`: { skipped: ScannedFile[]; replaced: ScannedFile[]; reported: DuplicateGroup[] }

## Flow integration
1) `FileScanner` scans files (respect recursive flag).
2) `DedupeService.findDuplicates` groups files by keys.
3) If action is `skip`, duplicates are removed from the list before `OperationPlanner`.
4) If action is `report`, write a report file but do not alter planned operations.
5) If action is `replace`, select a primary file in each group and schedule deletion or ignore duplicates (decision policy required).

## Replacement policy (proposal)
- Default primary: earliest modified or largest size (configurable).
- For `replace`, emit `FileOperationType.DELETE` or skip duplicates in planner (choose based on existing operation support).

## Performance notes
- Avoid hashing all files unless sha256 is enabled.
- Use a 2-stage pipeline: size -> optional metadata -> sha256.
- Cache metadata and hashes per file path during the dedupe run.

## Error handling
- If a strategy fails for a file, treat that file as non-duplicate for that strategy.
- Collect per-file strategy errors into a dedupe report.

## Minimal implementation steps
1) Add config fields and update defaults.
2) Implement `DedupeService` with injected strategies.
3) Implement strategies:
   - `NameStrategy`, `SizeStrategy`, `ImageDimensionsStrategy`, `Sha256Strategy`, `FilePropertiesStrategy`, `FileAttributesStrategy`, `ExifStrategy`.
4) Update `FileOrganizer` to run dedupe before planning operations.
5) Add report writer for `report` action.
6) Add tests for grouping logic and strategy composition.

## Testing
- Unit tests for each strategy key generation.
- Integration test for combined strategies and recursive scanning.
- Large file performance test for sha256 pathway.
