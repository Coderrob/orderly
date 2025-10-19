# Contributing to Orderly

Thank you for considering contributing to Orderly! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/orderly.git`
3. Install dependencies: `npm install`
4. Build the project: `npm run build`

## Development Workflow

1. Create a new branch for your feature or bugfix: `git checkout -b feature/my-feature`
2. Make your changes
3. Build and test your changes: `npm run build`
4. Test the CLI manually: `npm run dev -- organize ./test-folder`
5. Commit your changes: `git commit -am "Add my feature"`
6. Push to your fork: `git push origin feature/my-feature`
7. Create a Pull Request

## Project Structure

```
orderly/
├── src/
│   ├── cli.ts                 # CLI entry point
│   ├── index.ts               # Public API exports
│   ├── config/                # Configuration management
│   │   ├── types.ts          # TypeScript interfaces and types
│   │   └── config-loader.ts  # Config file loading/saving
│   ├── scanner/               # File scanning
│   │   └── file-scanner.ts   # Directory scanning and categorization
│   ├── organizer/             # File organization
│   │   ├── file-organizer.ts # File moving/renaming logic
│   │   └── manifest-generator.ts # Manifest generation
│   ├── logger/                # Logging
│   │   └── logger.ts         # Logging implementation
│   └── utils/                 # Utilities
│       └── naming.ts          # Naming convention conversions
├── dist/                      # Compiled JavaScript (generated)
└── README.md                  # Documentation
```

## Coding Guidelines

- Use TypeScript for type safety
- Follow existing code style
- Add comments for complex logic
- Keep functions focused and small
- Handle errors appropriately

## Adding New Features

### Adding a New File Category

Edit `src/config/types.ts` and add to the `DEFAULT_CONFIG.categories` array:

```typescript
{
  name: 'my-category',
  extensions: ['.ext1', '.ext2'],
  targetFolder: 'my-folder'
}
```

### Adding a New Naming Convention

1. Add the type to `NamingConvention.type` in `src/config/types.ts`
2. Implement the conversion function in `src/utils/naming.ts`
3. Add a case in `applyNamingConvention()`

### Adding a New CLI Command

Add a new command in `src/cli.ts` using Commander.js:

```typescript
program
  .command('my-command')
  .description('My command description')
  .action(async (options: any) => {
    // Implementation
  });
```

## Testing

Currently, the project relies on manual testing. You can test the tool by:

1. Creating a test directory with sample files
2. Running the tool with different configurations
3. Verifying the output and logs

Example:
```bash
# Create test files
mkdir /tmp/test && cd /tmp/test
touch "Test File.jpg" "Another Test.pdf"

# Test with dry-run
npm run dev -- organize /tmp/test --dry-run

# Test actual organization
npm run dev -- organize /tmp/test
```

## Pull Request Guidelines

- Ensure your code builds successfully
- Test your changes thoroughly
- Update documentation if needed
- Write clear commit messages
- Reference any related issues

## Questions?

If you have questions, please open an issue on GitHub.
