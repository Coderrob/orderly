# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Improved

- **Interface-Driven Development**: Consolidated duplicate `ConfigFormat` enum into single source of truth
- **Code Quality**: Fixed utils barrel export by removing .js extensions and adding interface re-exports
- **Test Coverage**: Added comprehensive tests for `ConsoleOutputWriter` implementing `IOutputWriter` interface
- **Architecture**: Extracted organizer interfaces to dedicated types file following IDD principles
- **CLI Refactoring**: Restructured CLI into modular command/service architecture with dependency injection
- **Error Handling**: Created typed error module with `IOrderlyError` interface and specific error classes for config, file operations, and validation

### Added

- **Error Module**: New `src/errors/` module with typed error classes extending `IOrderlyError`
- **Type Guards**: Added `isOrderlyError()` type guard function for runtime error type checking

## [1.0.0] - 2025-10-19

### Added

- Initial release of Orderly CLI tool
- File scanning and categorization by extension
- Support for 8 default file categories (images, documents, videos, audio, archives, code, spreadsheets, presentations)
- Naming convention enforcement with 4 styles:
  - kebab-case (default)
  - snake_case
  - camelCase
  - PascalCase
- File organization with automatic moving and renaming
- Manifest generation in both JSON and Markdown formats
- Comprehensive logging system with 4 levels (debug, info, warn, error)
- Dry-run mode for safe preview of changes
- Three CLI commands:
  - `orderly organize` - Organize files in a directory
  - `orderly scan` - Preview what would be organized
  - `orderly init` - Create a configuration file
- Configuration file support (YAML and JSON)
- Customizable file categories and patterns
- Exclude patterns for ignored files/folders
- Full audit trail with timestamps
- Colorized console output
- Comprehensive documentation and examples
