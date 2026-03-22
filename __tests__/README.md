# Integration Tests

This directory contains integration-style tests for the Orderly CLI tool. These tests verify the complete behavior of commands with real file system operations and before/after validation.

## Directory Structure

```
__tests__/
├── helpers/              # Test utility functions
│   ├── test-env-setup.ts    # Environment setup and file creation utilities
│   ├── test-assertions.ts   # Custom assertions for integration tests
│   └── index.ts             # Helper exports
└── integration/          # Integration test suites
    ├── init.integration.test.ts      # Tests for 'init' command
    ├── scan.integration.test.ts      # Tests for 'scan' command
    ├── organize.integration.test.ts  # Tests for 'organize' command
    └── dedupe.integration.test.ts    # Tests for dedupe feature
```

## Test Helpers

### TestEnvironmentSetup

Helper class for creating and managing test environments:

- `createTempDir()`: Creates a temporary test directory
- `createStructure(baseDir, structure)`: Creates a directory structure with files
- `createFile(filePath, content)`: Creates a single file
- `createDuplicates(baseDir, filePaths, content)`: Creates multiple duplicate files
- `readDirStructure(dirPath)`: Reads all files in a directory recursively
- `countFiles(dirPath)`: Counts total files in a directory
- `cleanup()`: Cleans up all created test directories

### TestAssertions

Custom assertion methods for integration tests:

- `assertFileExists(filePath)`: Asserts a file exists
- `assertFileNotExists(filePath)`: Asserts a file does not exist
- `assertDirExists(dirPath)`: Asserts a directory exists
- `assertFileContent(filePath, expectedContent)`: Asserts file content matches
- `assertFileCount(dirPath, expectedCount)`: Asserts exact file count
- `assertDirectoryStructure(dirPath, expectedFiles)`: Asserts complete directory structure
- `assertFilesIdentical(file1, file2)`: Asserts two files have identical content

## Integration Test Suites

### Init Command Tests (`init.integration.test.ts`)

Tests the `init` command functionality:

- ✅ JSON configuration creation
- ✅ YAML configuration creation
- ✅ Format validation (JSON/YAML/yml)
- ✅ Preventing overwrite of existing configs
- ✅ Configuration content validation
- ✅ Error handling

**Before/After Validation:**

- Verifies config file doesn't exist before
- Verifies config file exists with correct content after
- Verifies original files not modified when config exists

### Scan Command Tests (`scan.integration.test.ts`)

Tests the `scan` command functionality:

- ✅ Basic file scanning
- ✅ Nested directory scanning (recursive/non-recursive)
- ✅ File type filtering (include/exclude extensions)
- ✅ Pattern exclusion
- ✅ Large directory handling
- ✅ Configuration file integration
- ✅ Error handling

**Before/After Validation:**

- Verifies file count before scanning
- Verifies correct file detection
- Ensures no files are modified during scan

### Organize Command Tests (`organize.integration.test.ts`)

Tests the `organize` command functionality:

- ✅ File organization by type
- ✅ Dry-run mode (no modifications)
- ✅ Manifest generation
- ✅ Naming conventions (kebab-case, snake_case, etc.)
- ✅ Nested directory handling
- ✅ Name conflict resolution
- ✅ Custom output directory
- ✅ File filtering
- ✅ Error handling

**Before/After Validation:**

- Captures file count before organization
- Verifies files moved to correct directories
- Verifies original files removed from source
- Verifies file content preserved
- Verifies total file count maintained
- Verifies total file size maintained

### Dedupe Integration Tests (`dedupe.integration.test.ts`)

Tests the deduplication feature:

- ✅ Hash-based duplicate detection
- ✅ Metadata-based duplicate detection
- ✅ Combined strategy deduplication
- ✅ Duplicate actions (skip, report, replace)
- ✅ Dedupe with dry-run
- ✅ Dedupe with organization
- ✅ Manifest with dedupe info
- ✅ Performance with many duplicates
- ✅ Edge cases (empty files, special characters)

**Before/After Validation:**

- Verifies duplicate file detection
- Verifies correct files kept/skipped
- Verifies file integrity maintained
- Verifies dry-run doesn't modify files
- Ensures organized files include deduplication

## Running Integration Tests

### Run All Tests

```bash
npm test
```

### Run Integration Tests Only

```bash
npm test -- __tests__/integration
```

### Run Specific Test Suite

```bash
npm test -- __tests__/integration/init.integration.test.ts
npm test -- __tests__/integration/scan.integration.test.ts
npm test -- __tests__/integration/organize.integration.test.ts
npm test -- __tests__/integration/dedupe.integration.test.ts
```

### Run with Coverage

```bash
npm run test:coverage
```

### Watch Mode

```bash
npm run test:watch -- __tests__/integration
```

## Test Best Practices

### 1. Clean Test Environment

Each test creates a fresh temporary directory and cleans it up after completion:

```typescript
beforeEach(() => {
  testEnv = new TestEnvironmentSetup();
  testDir = testEnv.createTempDir();
});

afterEach(() => {
  testEnv.cleanup();
});
```

### 2. Before/After Validation

Always verify the state before and after operations:

```typescript
// Before
const beforeCount = testEnv.countFiles(testDir);
const beforeStructure = testEnv.readDirStructure(testDir);

// Execute operation
const result = await handler.execute(testDir, options);

// After
const afterCount = testEnv.countFiles(testDir);
const afterStructure = testEnv.readDirStructure(testDir);

// Validate
expect(afterCount).toBe(expectedCount);
TestAssertions.assertDirectoryStructure(testDir, expectedFiles);
```

### 3. Test Isolation

Each test should be completely independent:

- Use unique temporary directories
- Don't rely on test execution order
- Clean up all created resources

### 4. Realistic Scenarios

Create realistic file structures:

```typescript
const structure: ITestDirectoryStructure = {
  documents: {
    'report.pdf': { path: 'report.pdf', content: 'PDF content' },
    'notes.txt': { path: 'notes.txt', content: 'Text content' }
  },
  images: {
    'photo.jpg': { path: 'photo.jpg', content: 'Image data' }
  }
};
testEnv.createStructure(testDir, structure);
```

### 5. Error Scenarios

Test both success and failure cases:

```typescript
it('should handle non-existent directory', async () => {
  const result = await handler.execute('/nonexistent', {});
  expect(result.success).toBe(false);
  expect(result.exitCode).toBe(ExitCode.ERROR);
});
```

## Writing New Integration Tests

When adding new integration tests:

1. **Create test file** in `__tests__/integration/` with `.integration.test.ts` suffix
2. **Use test helpers** from `__tests__/helpers/`
3. **Follow naming conventions**: Describe blocks should be feature-focused
4. **Include before/after validation**: Always verify state changes
5. **Test edge cases**: Include error scenarios and boundary conditions
6. **Clean up resources**: Use `afterEach` to cleanup test environments
7. **Document test purpose**: Add clear descriptions to test cases

## Example Test Template

```typescript
import * as path from 'node:path';
import { TestEnvironmentSetup, TestAssertions } from '../helpers';

describe('Feature Integration Tests', () => {
  let testEnv: TestEnvironmentSetup;
  let testDir: string;

  beforeEach(() => {
    testEnv = new TestEnvironmentSetup();
    testDir = testEnv.createTempDir();
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  describe('Specific scenario', () => {
    it('should perform expected behavior', async () => {
      // Arrange - Setup test environment
      testEnv.createFile(path.join(testDir, 'test.txt'), 'content');
      const beforeCount = testEnv.countFiles(testDir);

      // Act - Execute command
      const result = await handler.execute(testDir, {});

      // Assert - Verify results
      expect(result.success).toBe(true);
      TestAssertions.assertFileExists(expectedPath);
      const afterCount = testEnv.countFiles(testDir);
      expect(afterCount).toBe(expectedCount);
    });
  });
});
```

## Coverage Requirements

Integration tests contribute to overall coverage goals:

- **Minimum 95% statement coverage**
- **90% branch coverage**
- **95% function coverage**
- **95% line coverage**

Run `npm run test:coverage` to verify coverage meets requirements.

## Troubleshooting

### Tests Failing Due to Cleanup

If tests fail with "directory not empty" errors, ensure cleanup is called:

```typescript
afterEach(() => {
  testEnv.cleanup();
  jest.restoreAllMocks(); // If using mocks
});
```

### Permission Errors

On Windows, ensure no processes have file handles open to test directories.

### Slow Tests

For performance tests with many files, use appropriate timeout:

```typescript
it('should handle many files', async () => {
  // Test code
}, 30000); // 30 second timeout
```

## Contributing

When contributing integration tests:

1. Follow the established patterns in existing tests
2. Add appropriate before/after validation
3. Include both positive and negative test cases
4. Update this README if adding new test categories
5. Ensure all tests pass locally before submitting PR

---

**Note**: Integration tests use real file system operations and may take longer than unit tests. They provide comprehensive end-to-end validation of Orderly's functionality.
