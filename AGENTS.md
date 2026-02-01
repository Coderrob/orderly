# Agent Expectations for Orderly Repository

This document outlines the expectations and standards for AI agents and automated tools contributing to the Orderly repository. Orderly is a TypeScript CLI tool for file organization that maintains high code quality and reliability standards.

## 🎯 Core Principles

- **Quality First**: All contributions must pass all quality checks
- **Test-Driven**: Comprehensive test coverage is mandatory
- **Type Safety**: Strict TypeScript usage with no `any` types
- **Documentation**: Clear, comprehensive documentation for all features
- **Consistency**: Follow established patterns and conventions

## 📋 Code Quality Standards

### TypeScript Requirements

- **Strict Mode**: All TypeScript files must compile with strict settings
- **No Any Types**: Avoid `any` types; use proper type definitions
- **Interface Usage**: Define interfaces for all data structures
- **Type Guards**: Implement type guards for runtime type checking
- **Generic Constraints**: Use generics appropriately with proper constraints

### Code Style

- **ESLint**: All code must pass ESLint checks (`npm run lint`)
- **Prettier**: Code must be formatted with Prettier (`npm run format`)
- **Naming Conventions**:
  - Files: `kebab-case.ts`
  - Classes: `PascalCase`
  - Methods/Properties: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Interfaces: `PascalCase` with `I` prefix (e.g., `IConfigLoader`)

### File Organization

```
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

## 🧪 Testing Requirements

### Test Coverage

- **Minimum Coverage**: 95% statement coverage required
- **Branch Coverage**: 90% branch coverage required
- **Function Coverage**: 95% function coverage required
- **Line Coverage**: 95% line coverage required

### Test Structure

- **File Naming**: `*.test.ts` or `*.spec.ts`
- **Test Organization**: Group related tests in describe blocks
- **Mock Usage**: Mock external dependencies appropriately
- **Edge Cases**: Test error conditions and edge cases
- **Integration Tests**: Include integration tests for complex workflows

### Test Categories

- **Unit Tests**: Test individual functions/classes in isolation
- **Integration Tests**: Test component interactions
- **CLI Tests**: Test command-line interface functionality
- **Error Handling**: Test error scenarios and recovery

## 📚 Documentation Standards

### Code Documentation

- **JSDoc Comments**: All public APIs must have JSDoc comments
- **Parameter Documentation**: Document all parameters and return types
- **Example Usage**: Include usage examples where appropriate
- **Error Documentation**: Document thrown errors and exceptions

### README Updates

- **Feature Documentation**: Update README.md for new features
- **Usage Examples**: Provide clear usage examples
- **Configuration**: Document configuration options
- **API Reference**: Maintain up-to-date API documentation

## 🔄 Development Workflow

### Quality Checks

All changes must pass these checks (run `npm run verify`):

1. **TypeScript Compilation** (`npm run typecheck`)
2. **ESLint** (`npm run lint`)
3. **Prettier Format Check** (`npm run format:check`)
4. **Unit Tests with Coverage** (`npm run test:coverage`)
5. **Code Duplication Check** (`npm run duplication:check`)

### Commit Conventions

- **Conventional Commits**: Use conventional commit format
- **Clear Messages**: Write clear, descriptive commit messages
- **Atomic Commits**: Each commit should be a single logical change
- **Test Commits**: Include tests with feature commits

### Pull Request Guidelines

- **Draft PRs**: Use draft PRs for work-in-progress
- **Descriptive Titles**: Clear, descriptive PR titles
- **Detailed Description**: Explain what, why, and how
- **Link Issues**: Reference related issues
- **Checklist**: Include testing and verification checklist

## 🔍 Code Review Expectations

### Review Criteria

- **Functionality**: Code works as intended
- **Tests**: Adequate test coverage and quality
- **Style**: Follows code style guidelines
- **Performance**: No obvious performance issues
- **Security**: No security vulnerabilities
- **Documentation**: Appropriate documentation included

### Automated Checks

- **CI/CD**: All CI checks must pass
- **Coverage**: Coverage requirements met
- **Quality Gates**: SonarQube quality gates passed
- **Dependencies**: No vulnerable dependencies

## 🛡️ Security Considerations

### Input Validation

- **Sanitize Inputs**: Validate and sanitize all user inputs
- **Path Traversal**: Prevent path traversal attacks
- **File Access**: Safe file system operations
- **Command Injection**: Prevent command injection vulnerabilities

### Error Handling

- **Custom Errors**: Use custom error classes with proper categorization
- **Logging**: Log errors appropriately without exposing sensitive data
- **Recovery**: Implement graceful error recovery where possible
- **User Feedback**: Provide clear error messages to users

## 🚀 Feature Development

### Planning

- **Issue Creation**: Create GitHub issues for features
- **Design Review**: Review design decisions before implementation
- **Breaking Changes**: Plan for backward compatibility
- **Documentation**: Plan documentation updates

### Implementation

- **Incremental Changes**: Break large features into smaller PRs
- **Backward Compatibility**: Maintain backward compatibility
- **Configuration**: Make features configurable where appropriate
- **Logging**: Add appropriate logging for new features

### Validation

- **Manual Testing**: Test features manually before PR
- **Integration Testing**: Ensure integration with existing features
- **Performance Testing**: Verify performance impact
- **Documentation Testing**: Verify documentation accuracy

## 📊 Metrics and Monitoring

### Quality Metrics

- **Test Coverage**: Maintain >95% coverage
- **Code Duplication**: Keep duplication <1%
- **Maintainability**: Maintain A grade
- **Technical Debt**: Minimize technical debt

### Performance

- **Memory Usage**: Monitor memory consumption
- **Execution Time**: Track command execution times
- **File Operations**: Efficient file system operations
- **Scalability**: Handle large directory structures

## 🤖 Agent-Specific Guidelines

### Code Generation

- **Pattern Consistency**: Follow existing code patterns
- **Import Organization**: Organize imports consistently
- **Error Patterns**: Use established error handling patterns
- **Testing Patterns**: Follow existing testing patterns

### Refactoring

- **Safe Refactoring**: Ensure refactoring doesn't break functionality
- **Test Updates**: Update tests for refactored code
- **Documentation Updates**: Update documentation for changes
- **Migration Path**: Provide migration guidance if needed

### Debugging

- **Logging**: Add appropriate debug logging
- **Error Messages**: Provide clear error messages
- **Stack Traces**: Include relevant context in errors
- **Troubleshooting**: Document common issues and solutions

## 📞 Communication

### Issue Reporting

- **Clear Description**: Provide clear issue descriptions
- **Reproduction Steps**: Include steps to reproduce issues
- **Environment Info**: Include relevant environment information
- **Expected Behavior**: Describe expected vs actual behavior

### Collaboration

- **Respectful Communication**: Maintain professional communication
- **Constructive Feedback**: Provide constructive feedback
- **Knowledge Sharing**: Share learnings and best practices
- **Team Coordination**: Coordinate with human maintainers

---

## Verification Checklist

Before submitting contributions, ensure:

- [ ] All quality checks pass (`npm run verify`)
- [ ] Test coverage meets requirements
- [ ] Code follows established patterns
- [ ] Documentation is updated
- [ ] No breaking changes without migration plan
- [ ] Security considerations addressed
- [ ] Performance impact assessed
- [ ] Manual testing completed

This document is living and should be updated as standards evolve.</content>
<parameter name="filePath">D:\orderly\AGENTS.md
