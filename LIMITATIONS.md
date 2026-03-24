# Orderly - Known Limitations and Implementation Plans

This document outlines current limitations in Orderly and provides detailed implementation plans to address them.

## Overview

Orderly is a functional file organization tool, but several features are either not implemented or have behavioral constraints. This document serves as a roadmap for future enhancements.

---

## Recently Implemented Features ✅

### File Name Collision Handling

**Status:** ✅ **Implemented** (as of PR #11)

**Feature Description:**
Orderly now includes configurable collision resolution strategies to handle files with identical names being organized to the same target folder.

**Available Strategies:**

1. **Skip Strategy** (`skip`)
   - Skips files that would collide with existing files
   - Logs warnings for skipped operations
   - First file wins, subsequent files are not moved

2. **Keep Both Strategy** (`keep-both`) - Default
   - Renames colliding files using a configurable pattern
   - Default pattern: `{name}-{n}{ext}` (e.g., `readme.txt`, `readme-1.txt`, `readme-2.txt`)
   - Preserves all files with unique names
   - Supports up to 100 rename attempts by default (configurable)

3. **Replace Strategy** (`replace`)
   - Replaces existing file with the new one
   - Deletes the existing file before moving the new one
   - Use with caution as data may be lost

**Configuration:**

```typescript
interface OrderlyConfig {
  // ... other fields
  collisionResolution?: {
    strategy: 'skip' | 'keep-both' | 'replace';
    renamePattern?: string; // Default: '{name}-{n}{ext}'
    maxAttempts?: number; // Default: 100
  };
}
```

**Example Usage:**

```yaml
# .orderly.yml
collisionResolution:
  strategy: keep-both
  renamePattern: '{name} ({n}){ext}' # Optional custom pattern
  maxAttempts: 50 # Optional max rename attempts
```

**Implementation Details:**

- Collision detection happens during operation execution in `OperationExecutor`
- Rename pattern supports placeholders: `{name}`, `{n}`, `{ext}`
- Falls back to timestamp-based naming if max attempts exceeded
- Proper logging for all collision scenarios

**Future Enhancements:**

Potential improvements for future releases:

- Interactive mode (`ask` strategy) to prompt user for each collision
- Early collision detection in `OperationPlanner` phase
- Collision preview before execution

---

## Current Limitations

### 1. Custom Output Directory ⚠️ **Medium Priority**

**Status:** ✅ **Implemented**

Custom output directory support has been added, allowing files to be organized to a different location than the source directory.

**Configuration:**

```typescript
interface OrderlyConfig {
  targetDirectory?: string; // Absolute or relative path
}
```

**CLI Usage:**

```bash
orderly organize --output /path/to/output
orderly organize -o /custom/directory
```

**Example Usage:**

```yaml
# .orderly.yml
targetDirectory: /output
```

```bash
# Before (default behavior)
/source/file.txt      →  /source/documents/file.txt
/source/photo.jpg     →  /source/images/photo.jpg

# After (with --output /organized)
/source/file.txt      →  /organized/documents/file.txt
/source/photo.jpg     →  /organized/images/photo.jpg
```

See the implementation in:

- `src/config/types.ts` - Type definitions
- `src/organizer/operation-planner.ts` - Path resolution logic
- `src/cli/cli.service.ts` - CLI option handling

---

### 2. Non-Recursive Scanning ℹ️ **Low Priority**

**Current Behavior:**
The file scanner always scans recursively using the glob pattern `**/*`, finding all files in all subdirectories. There's no option to scan only the root level.

**Impact:**

- Cannot limit organization to root directory only
- May scan unnecessary deep directory structures
- Performance impact on very large directory trees

**Implementation Plan:**

#### Phase 1: Configuration

1. **Add scanning options to `OrderlyConfig`**

   ```typescript
   interface OrderlyConfig {
     // ... existing fields
     scanning?: {
       recursive?: boolean; // Default: true
       maxDepth?: number; // Default: unlimited
       followSymlinks?: boolean; // Default: false
     };
   }
   ```

2. **Add CLI options**

   ```bash
   orderly scan --no-recursive
   orderly scan --max-depth 2
   ```

#### Phase 2: Update FileScanner

1. **Modify `findFiles` method**

   ```typescript
   private async findFiles(directory: string): Promise<string[]> {
     const recursive = this.config.scanning?.recursive ?? true;
     const maxDepth = this.config.scanning?.maxDepth;

     let pattern: string;
     if (!recursive) {
       pattern = this.config.includeHidden ? '*' : '[!.]*';
     } else if (maxDepth) {
       // Build depth-limited pattern
       pattern = this.buildDepthPattern(maxDepth);
     } else {
       pattern = this.config.includeHidden ? '**/*' : '**/[!.]*';
     }

     return glob(pattern, {
       cwd: directory,
       nodir: true,
       absolute: false,
       ignore: this.config.excludePatterns
     });
   }
   ```

2. **Depth limiting helper**

   ```typescript
   private buildDepthPattern(maxDepth: number): string {
     const segments = Array(maxDepth).fill('*').join('/');
     return this.config.includeHidden ? segments : segments.replace(/\*/g, '[!.]*');
   }
   ```

#### Phase 3: Testing

- Test non-recursive scanning
- Test depth-limited scanning (1, 2, 3 levels)
- Performance benchmarks for large directory trees
- Edge cases: symlinks, circular references

**Complexity:** Low
**Dependencies:** None

---

### 3. Extension-Based Filtering During Scan 📊 **Low Priority**

**Current Behavior:**
The scanner finds all files regardless of extension. Filtering happens during organization through category definitions. This means:

- All files are scanned and processed
- Memory overhead for files that won't be organized
- No way to scan only specific file types

**Impact:**

- Performance impact when scanning directories with many file types
- Cannot quickly scan for specific extensions
- No pre-filtering before heavy operations (hashing, metadata extraction)

**Implementation Plan:**

#### Phase 1: Configuration

1. **Add filter options to scanning config**

   ```typescript
   interface OrderlyConfig {
     scanning?: {
       // ... existing options
       includeExtensions?: string[]; // Only scan these extensions
       excludeExtensions?: string[]; // Skip these extensions
     };
   }
   ```

2. **CLI options**

   ```bash
   orderly scan --include ".jpg,.png,.gif"
   orderly scan --exclude ".tmp,.log"
   ```

#### Phase 2: Implementation Options

**Option A: Glob Pattern Filtering (Recommended)**

- Modify glob patterns to include/exclude extensions
- Most efficient - filtering at file system level
- Example: `**/*.{jpg,png,gif}` for inclusion

**Option B: Post-Scan Filtering**

- Filter results after glob returns
- Less efficient but simpler to implement
- Good for complex filter logic

**Recommended Implementation (Option A):**

```typescript
private async findFiles(directory: string): Promise<string[]> {
  const basePattern = this.buildBasePattern();
  const extensionPattern = this.buildExtensionPattern();

  return glob(extensionPattern || basePattern, {
    cwd: directory,
    nodir: true,
    absolute: false,
    ignore: this.buildIgnorePatterns()
  });
}

private buildExtensionPattern(): string | null {
  const { includeExtensions, excludeExtensions } = this.config.scanning || {};

  if (includeExtensions?.length) {
    const exts = includeExtensions.map(e => e.replace(/^\./, '')).join(',');
    return `**/*.{${exts}}`;
  }

  // Exclusion handled via ignore patterns
  return null;
}

private buildIgnorePatterns(): string[] {
  const patterns = [...this.config.excludePatterns];
  const { excludeExtensions } = this.config.scanning || {};

  if (excludeExtensions?.length) {
    excludeExtensions.forEach(ext => {
      patterns.push(`**/*${ext.startsWith('.') ? ext : '.' + ext}`);
    });
  }

  return patterns;
}
```

#### Phase 3: Relationship with Categories

1. **Clarify distinction**
   - Scanning filters: What files to find
   - Categories: How to organize found files

2. **Validation**
   - Warn if includeExtensions doesn't overlap with any category
   - Suggest removing excludeExtensions that match no categories

#### Phase 4: Performance Optimization

- Benchmark scanning with vs without filters
- Test on directories with 10k+ files
- Compare glob pattern vs post-filter performance

**Complexity:** Low-Medium
**Dependencies:** None

---

## Implementation Priority & Roadmap

### Medium Priority (Future Release)

1. **Custom Output Directory**
   - Enables important use cases
   - Good UX improvement

### Low Priority (As Needed)

2. **Non-Recursive Scanning**
   - Nice to have
   - Workaround available (use excludePatterns)

3. **Extension-Based Filtering**
   - Performance optimization
   - Categories provide similar functionality

---

## Development Guidelines

### Before Implementation

- [ ] Review and update this plan based on new insights
- [ ] Create GitHub issues for each feature
- [ ] Get user feedback on priority and approach
- [ ] Review AGENTS.md for quality standards

### During Implementation

- [ ] Write tests first (TDD approach)
- [ ] Update type definitions
- [ ] Add JSDoc documentation
- [ ] Follow existing code patterns
- [ ] Maintain >95% test coverage

### After Implementation

- [ ] Update README.md with new features
- [ ] Add migration guide if breaking changes
- [ ] Update CHANGELOG.md
- [ ] Run full verification: `npm run verify`
- [ ] Manual testing of new features
- [ ] Update this document to mark completed

---

## Related Documentation

- [AGENTS.md](./AGENTS.md) - Development standards and expectations
- [README.md](./README.md) - User-facing documentation
- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [**tests**/README.md](./__tests__/README.md) - Testing guide
- [**tests**/CONFIG_ISSUE.md](./__tests__/CONFIG_ISSUE.md) - Configuration structure notes

---

## Contributing

If you'd like to contribute to implementing any of these features:

1. Comment on the related GitHub issue
2. Follow the implementation plan outlined above
3. Ensure all quality checks pass
4. Submit a PR with comprehensive tests
5. Update relevant documentation

For questions or discussions, please open an issue on GitHub.

---

_Last Updated: February 2, 2026_
_Document Version: 1.0_
