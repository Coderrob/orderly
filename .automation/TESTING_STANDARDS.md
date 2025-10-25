# Testing Standards and Guidelines

## Overview

This document defines the testing standards, practices, and requirements for the Orderly codebase. All code must meet these standards to be considered production-ready.

## Testing Philosophy

### Core Principles

1. **High Coverage**: Minimum 90% code coverage across all metrics
2. **Side-by-Side Tests**: Test files live alongside implementation files
3. **AAA Pattern**: Arrange, Act, Assert - no conditional logic in tests
4. **Fluent Style**: Inline function calls to reduce code count
5. **Table-Driven Tests**: Use `it.each` for multiple test cases
6. **Mock Isolation**: All mocks defined in root describe, initialized in beforeEach

## Test File Structure

### Naming Convention

- Implementation file: `my-service.ts`
- Test file: `my-service.spec.ts` (side-by-side)

### Standard Test Template

```typescript
import { MyService } from './my-service';

describe('MyService', () => {
  // Mock values defined at root level
  let mockDependency: jest.Mocked<DependencyType>;
  let testValue: string;
  let service: MyService;

  beforeEach(() => {
    // Initialize mocks and test values
    mockDependency = {
      method: jest.fn()
    } as jest.Mocked<DependencyType>;
    
    testValue = 'test-value';
    service = new MyService(mockDependency);
  });

  afterEach(() => {
    // Clean up mocks and resources
    jest.clearAllMocks();
  });

  describe('publicMethod', () => {
    it('should return expected result when input is valid', () => {
      // Arrange (Apply)
      mockDependency.method.mockReturnValue('mocked-result');
      
      // Act (Action)
      const result = service.publicMethod(testValue);
      
      // Assert
      expect(result).toBe('expected-result');
      expect(mockDependency.method).toHaveBeenCalledWith(testValue);
    });

    it.each([
      ['input1', 'output1'],
      ['input2', 'output2'],
      ['input3', 'output3']
    ])('should transform %s to %s', (input, expected) => {
      const result = service.publicMethod(input);
      expect(result).toBe(expected);
    });
  });

  describe('privateMethod (bracket notation)', () => {
    it('should handle private logic correctly', () => {
      // Access private method using bracket notation
      const result = service['privateMethod']('test-input');
      expect(result).toBeDefined();
    });
  });
});
```

## Test Structure Rules

### 1. Root Describe

- Named after the file or class functionality
- Contains all mock declarations
- One class per file maximum

```typescript
describe('ClassName', () => {
  // All tests for this class
});
```

### 2. Function Describes

- One describe block per function
- Use bracket notation for private functions

```typescript
describe('publicFunction', () => {
  // Tests for public function
});

describe('privateFunction (bracket notation)', () => {
  // Tests for private function
});
```

### 3. beforeEach Rules

- Initialize all mocks
- Set up test values
- Create service instances
- **NO** `jest.clearAllMocks()` or reset calls

```typescript
beforeEach(() => {
  mockValue = createMock();
  service = new Service(mockValue);
});
```

### 4. afterEach Rules

- Clear all mocks
- Clean up test resources
- Reset any global state

```typescript
afterEach(() => {
  jest.clearAllMocks();
  // Clean up any test resources
});
```

### 5. Test Cases (AAA Pattern)

#### Arrange (Apply)

Set up mocks and test data:

```typescript
mockDependency.method.mockReturnValue('value');
const input = 'test-input';
```

#### Act (Action)

Invoke the function under test:

```typescript
const result = service.methodUnderTest(input);
```

#### Assert

Verify the results:

```typescript
expect(result).toBe('expected');
expect(mockDependency.method).toHaveBeenCalledWith(input);
```

### 6. Table-Driven Tests

Use `it.each` for multiple similar test cases:

```typescript
it.each([
  // [input, expected, description]
  ['valid-input', true, 'valid case'],
  ['invalid-input', false, 'invalid case'],
  ['', false, 'empty case']
])('should handle %s correctly', (input, expected, description) => {
  const result = service.validate(input);
  expect(result).toBe(expected);
});
```

## Coverage Requirements

### Minimum Thresholds

```json
{
  "coverageThreshold": {
    "global": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  }
}
```

### Coverage Reports

- **HTML**: `coverage/index.html` - Visual coverage report
- **LCOV**: `coverage/lcov.info` - CI/CD integration
- **JSON**: `coverage/coverage-final.json` - Detailed metrics
- **Text**: Console output for quick checks

## Code Quality Standards

### 1. Cyclomatic Complexity

- **Maximum per function**: 10
- **Average per file**: 5
- Measured by SonarQube

### 2. Code Duplication

- **Maximum allowed**: 1%
- Measured by jscpd
- Enforced in test suite

### 3. Static Analysis (SonarQube)

- **Maintainability Rating**: A
- **Reliability Rating**: A
- **Security Rating**: A
- **Code Smells**: 0
- **Bugs**: 0
- **Vulnerabilities**: 0

## Testing Best Practices

### ✅ DO

1. **Test public contracts**: Focus on public API behavior
2. **Test edge cases**: Empty strings, null, undefined, boundaries
3. **Test error cases**: Exceptions and error conditions
4. **Use descriptive names**: Test names explain what they verify
5. **Keep tests independent**: No test should depend on another
6. **Mock external dependencies**: Isolate the unit under test
7. **Use fluent assertions**: Chain expect calls when appropriate
8. **Test one thing**: Each test verifies one behavior

### ❌ DON'T

1. **No conditional logic**: No if/else in test functions
2. **No loops**: Use `it.each` instead
3. **No shared mutable state**: Between test cases
4. **No test interdependence**: Tests must run independently
5. **No implementation details**: Test behavior, not implementation
6. **No magic values**: Use named constants
7. **No duplicate setup**: Use beforeEach for common setup
8. **No assertions in beforeEach**: Only setup code

## Example Test Files

### Utility Class Test

```typescript
// file-system-utils.spec.ts
import { FileSystemUtils } from './file-system-utils';
import * as fs from 'fs';
import * as path from 'node:path';

jest.mock('fs');
jest.mock('path');

describe('FileSystemUtils', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;
  
  let testPath: string;
  let testContent: string;

  beforeEach(() => {
    testPath = '/test/path/file.txt';
    testContent = 'test content';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exists', () => {
    it.each([
      [true, 'exists'],
      [false, 'does not exist']
    ])('should return %s when file %s', (expected) => {
      mockFs.existsSync.mockReturnValue(expected);
      
      const result = FileSystemUtils.exists(testPath);
      
      expect(result).toBe(expected);
      expect(mockFs.existsSync).toHaveBeenCalledWith(testPath);
    });
  });

  describe('readFile', () => {
    it('should read and return file content', () => {
      mockFs.readFileSync.mockReturnValue(testContent);
      
      const result = FileSystemUtils.readFile(testPath);
      
      expect(result).toBe(testContent);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(testPath, 'utf8');
    });
  });
});
```

### Service Class Test

```typescript
// config-loader.spec.ts
import { ConfigLoader } from './config-loader';
import { FileSystemUtils } from '../utils/file-system-utils';
import { ConfigParser } from '../utils/config-parser';

jest.mock('../utils/file-system-utils');
jest.mock('../utils/config-parser');

describe('ConfigLoader', () => {
  const mockFileSystemUtils = FileSystemUtils as jest.Mocked<typeof FileSystemUtils>;
  const mockConfigParser = ConfigParser as jest.Mocked<typeof ConfigParser>;
  
  let testConfigPath: string;
  let testConfig: any;

  beforeEach(() => {
    testConfigPath = '/config/test.yml';
    testConfig = { test: 'config' };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('load', () => {
    it('should load config from specified path', () => {
      mockFileSystemUtils.exists.mockReturnValue(true);
      mockConfigParser.parse.mockReturnValue(testConfig);
      
      const result = ConfigLoader.load(testConfigPath);
      
      expect(result).toMatchObject(testConfig);
      expect(mockFileSystemUtils.exists).toHaveBeenCalledWith(testConfigPath);
      expect(mockConfigParser.parse).toHaveBeenCalledWith(testConfigPath);
    });

    it('should throw error when config file not found', () => {
      mockFileSystemUtils.exists.mockReturnValue(false);
      
      expect(() => ConfigLoader.load(testConfigPath)).toThrow('Config file not found');
    });
  });
});
```

## Configuration Files

### jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  verbose: true
};
```

### tsconfig.test.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.spec.ts"
  ]
}
```

## NPM Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --coverage --ci --maxWorkers=2",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "quality": "npm run lint && npm run format:check && npm run test:coverage",
    "duplication": "jscpd src --threshold 1",
    "complexity": "sonarqube-scanner",
    "verify": "npm run quality && npm run duplication"
  }
}
```

## Quality Gate Enforcement

All quality checks are enforced as part of the test suite:

1. **Unit Tests**: Must pass with 90% coverage
2. **Linting**: No ESLint errors
3. **Formatting**: Code must be formatted
4. **Duplication**: < 1% duplicated code
5. **Complexity**: Average cyclomatic complexity < 5

## Continuous Integration

Tests are run in CI/CD pipeline with:

- Full coverage report
- Quality gate checks
- Duplication detection
- Static analysis

Failing any check blocks the build.

## Summary

This testing standard ensures:

- ✅ High code quality (90% coverage minimum)
- ✅ Maintainable tests (clear structure)
- ✅ Fast feedback (isolated tests)
- ✅ Reliable builds (quality gates)
- ✅ Clean code (duplication < 1%)
- ✅ Low complexity (maintainable)

Follow these standards for all new code and when refactoring existing code.
