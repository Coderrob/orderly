# Code Quality Standards

## Overview
This document defines the code quality standards and practices for the Orderly project. All code must meet these standards before being merged.

## SOLID Principles

### Single Responsibility Principle (SRP)
Each class or module should have only one reason to change.

**Good Example:**
```typescript
// Each class has a single, well-defined responsibility
class FileReader {
  read(path: string): string { /* ... */ }
}

class FileWriter {
  write(path: string, content: string): void { /* ... */ }
}

class FileValidator {
  validate(path: string): boolean { /* ... */ }
}
```

**Bad Example:**
```typescript
// God class with multiple responsibilities
class FileManager {
  read(path: string): string { /* ... */ }
  write(path: string, content: string): void { /* ... */ }
  validate(path: string): boolean { /* ... */ }
  format(content: string): string { /* ... */ }
  compress(content: string): Buffer { /* ... */ }
}
```

### Open/Closed Principle (OCP)
Software entities should be open for extension but closed for modification.

**Good Example:**
```typescript
interface FileFormatter {
  format(content: string): string;
}

class JsonFormatter implements FileFormatter {
  format(content: string): string {
    return JSON.stringify(JSON.parse(content), null, 2);
  }
}

class MarkdownFormatter implements FileFormatter {
  format(content: string): string {
    // Markdown formatting logic
    return content;
  }
}
```

### Liskov Substitution Principle (LSP)
Derived classes must be substitutable for their base classes.

**Good Example:**
```typescript
interface Logger {
  log(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }
}

class FileLogger implements Logger {
  log(message: string): void {
    // Write to file
  }
}
```

### Interface Segregation Principle (ISP)
Clients should not be forced to depend on interfaces they don't use.

**Good Example:**
```typescript
interface Readable {
  read(): string;
}

interface Writable {
  write(content: string): void;
}

interface Deletable {
  delete(): void;
}

class File implements Readable, Writable, Deletable {
  read(): string { /* ... */ }
  write(content: string): void { /* ... */ }
  delete(): void { /* ... */ }
}

class ReadOnlyFile implements Readable {
  read(): string { /* ... */ }
}
```

### Dependency Inversion Principle (DIP)
Depend on abstractions, not on concretions.

**Good Example:**
```typescript
interface Storage {
  save(key: string, value: string): void;
  load(key: string): string;
}

class FileStorage implements Storage {
  save(key: string, value: string): void { /* ... */ }
  load(key: string): string { /* ... */ }
}

class ConfigManager {
  constructor(private storage: Storage) {}
  
  saveConfig(config: any): void {
    this.storage.save('config', JSON.stringify(config));
  }
}
```

## Clean Code Principles

### Meaningful Names
```typescript
// Good: Clear, descriptive names
function calculateTotalPrice(items: Item[]): number { /* ... */ }
const MAX_RETRY_ATTEMPTS = 3;
const isValidEmail = (email: string): boolean => { /* ... */ };

// Bad: Unclear, abbreviated names
function calc(x: any[]): number { /* ... */ }
const MRA = 3;
const chk = (e: string): boolean => { /* ... */ };
```

### Small Functions
- Maximum 50 lines per function
- Maximum 5 parameters
- Do one thing well

```typescript
// Good: Small, focused function
function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedExtensions.includes(extension) : false;
}

// Bad: Large, multi-purpose function
function processFile(filename: string): any {
  // 100+ lines of mixed responsibilities
}
```

### Function Composition
Use small, composable functions:

```typescript
// Good: Composed from small functions
const processFiles = (files: string[]): ProcessedFile[] =>
  files
    .filter(isValidFile)
    .map(readFile)
    .map(parseContent)
    .map(transformData);

// Bad: Large monolithic function
function processFiles(files: string[]): ProcessedFile[] {
  const result = [];
  for (const file of files) {
    if (/* validation logic */) {
      const content = /* read logic */;
      const parsed = /* parse logic */;
      const transformed = /* transform logic */;
      result.push(transformed);
    }
  }
  return result;
}
```

### Avoid Deep Nesting
Maximum nesting depth: 3

```typescript
// Good: Early returns, flat structure
function processItem(item: Item | null): Result {
  if (!item) return null;
  if (!item.isValid) return null;
  
  return transformItem(item);
}

// Bad: Deep nesting
function processItem(item: Item | null): Result {
  if (item) {
    if (item.isValid) {
      if (item.data) {
        if (item.data.length > 0) {
          // Deep nested logic
        }
      }
    }
  }
}
```

## Complexity Metrics

### Cyclomatic Complexity
- **Target**: < 5
- **Maximum**: 10
- **Measure**: Number of linearly independent paths through code

**Reducing Complexity:**
```typescript
// Good: Low complexity (2)
function isValidUser(user: User): boolean {
  return user.age >= 18 && user.isVerified;
}

// Bad: High complexity (5+)
function isValidUser(user: User): boolean {
  if (user.age < 18) return false;
  if (!user.isVerified) return false;
  if (user.status === 'banned') return false;
  if (!user.email) return false;
  if (!user.name) return false;
  return true;
}

// Better: Split into smaller functions
function hasValidAge(user: User): boolean {
  return user.age >= 18;
}

function hasValidStatus(user: User): boolean {
  return user.isVerified && user.status !== 'banned';
}

function hasRequiredFields(user: User): boolean {
  return Boolean(user.email && user.name);
}

function isValidUser(user: User): boolean {
  return hasValidAge(user) && hasValidStatus(user) && hasRequiredFields(user);
}
```

### Code Duplication
- **Target**: < 0.5%
- **Maximum**: 1%
- **Tool**: jscpd

**Eliminating Duplication:**
```typescript
// Good: Extracted common logic
function processData<T>(data: T[], transformer: (item: T) => T): T[] {
  return data.filter(isValid).map(transformer);
}

const processUsers = (users: User[]) => processData(users, normalizeUser);
const processItems = (items: Item[]) => processData(items, normalizeItem);

// Bad: Duplicated logic
function processUsers(users: User[]): User[] {
  return users.filter(u => u.isValid).map(normalizeUser);
}

function processItems(items: Item[]): Item[] {
  return items.filter(i => i.isValid).map(normalizeItem);
}
```

## File Organization

### File Size
- Maximum 300 lines per file
- Prefer smaller, focused files

### One Class Per File
```typescript
// Good: one-class.ts
export class OneClass {
  // Single class implementation
}

// Bad: multiple-classes.ts
export class ClassA { /* ... */ }
export class ClassB { /* ... */ }
export class ClassC { /* ... */ }
```

### Folder Structure
```
src/
├── feature/
│   ├── feature.ts           # Main implementation
│   ├── feature.spec.ts      # Tests side-by-side
│   ├── feature-helper.ts    # Helper utilities
│   └── types.ts             # Type definitions
```

## TypeScript Best Practices

### Strict Mode
Enable all strict type checking options:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### Type Safety
```typescript
// Good: Explicit types
function processFile(filename: string): Promise<ProcessedFile> {
  // ...
}

// Bad: Implicit any
function processFile(filename) {
  // ...
}
```

### Avoid Any
```typescript
// Good: Proper typing
interface Config {
  name: string;
  value: number;
}

function processConfig(config: Config): void {
  // ...
}

// Bad: Using any
function processConfig(config: any): void {
  // ...
}
```

## Error Handling

### Use Custom Error Classes
```typescript
// Good: Custom error classes
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class FileNotFoundError extends Error {
  constructor(path: string) {
    super(`File not found: ${path}`);
    this.name = 'FileNotFoundError';
  }
}
```

### Fail Fast
```typescript
// Good: Early validation
function processFile(path: string): void {
  if (!path) throw new ValidationError('Path is required');
  if (!fileExists(path)) throw new FileNotFoundError(path);
  
  // Process file
}

// Bad: Late validation
function processFile(path: string): void {
  // Do lots of work
  // ...
  // Finally check if path is valid
  if (!path) throw new Error('Invalid path');
}
```

## Documentation

### JSDoc Comments
Use JSDoc for public APIs:
```typescript
/**
 * Organizes files based on configuration rules.
 * @param files - Array of files to organize
 * @param config - Organization configuration
 * @returns Array of planned operations
 * @throws {ValidationError} If configuration is invalid
 */
function organizeFiles(files: File[], config: Config): Operation[] {
  // ...
}
```

### Code Comments
- Comment **why**, not **what**
- Code should be self-documenting
- Use comments sparingly

```typescript
// Good: Explains why
// Use async iteration to avoid loading all files into memory
for await (const file of largeFileSet) {
  process(file);
}

// Bad: States the obvious
// Loop through files
for (const file of files) {
  process(file);
}
```

## Quality Automation

### Pre-commit Checks
```bash
npm run verify  # Runs all quality checks
```

### CI/CD Pipeline
1. Lint code
2. Run type checking
3. Run tests with coverage
4. Check code duplication
5. Run SonarQube analysis
6. Build project

### Quality Metrics Dashboard
- Code coverage: >90%
- Duplication: <1%
- Complexity: <10
- Maintainability: A rating
- Security: No vulnerabilities

## Refactoring Guidelines

### When to Refactor
- Before adding new features
- When code smells are detected
- When tests are difficult to write
- When complexity exceeds thresholds

### How to Refactor
1. Ensure existing tests pass
2. Make small, incremental changes
3. Run tests after each change
4. Commit frequently
5. Keep tests passing

### Code Smells to Watch For
- Long methods (>50 lines)
- Large classes (>300 lines)
- Too many parameters (>5)
- Duplicated code
- Deep nesting (>3 levels)
- High complexity (>10)
- Unclear names
- Comments that explain what code does

## Tools and Automation

### ESLint
- Enforces code style
- Catches common errors
- Ensures consistency

### Prettier
- Formats code automatically
- Consistent style across project
- No style debates

### TypeScript
- Type safety
- Better refactoring
- Improved IDE support

### Jest
- Unit testing
- Coverage reporting
- Snapshot testing

### jscpd
- Detects code duplication
- Enforces DRY principle
- Reports duplication metrics

### SonarQube
- Code quality analysis
- Security vulnerability detection
- Technical debt tracking
- Complexity metrics

## Continuous Improvement

### Code Reviews
- All code must be reviewed
- Focus on quality, not just functionality
- Share knowledge and best practices
- Be constructive and specific

### Team Standards
- Update standards as project evolves
- Document decisions and patterns
- Share learnings from mistakes
- Celebrate improvements

### Learning Resources
- SOLID principles documentation
- Clean Code by Robert C. Martin
- Refactoring by Martin Fowler
- TypeScript best practices
- Testing best practices

---

**Remember**: Quality is not an act, it is a habit. Write code that you'll be proud of six months from now.
