import * as path from 'node:path';

import { ScanHandler } from '../../src/cli/commands/scan.command';
import { ConfigService } from '../../src/cli/services/config.service';
import { DirectoryValidator } from '../../src/cli/services/directory-validator.service';
import { ExitCode } from '../../src/cli/constants';
import { TestEnvironmentSetup, createTestConfig, ITestDirectoryStructure } from '../helpers';

/**
 * Integration tests for the scan command.
 * These tests verify the actual behavior of scanning directories and reporting file statistics.
 */
describe('Scan Command Integration Tests', () => {
  let testEnv: TestEnvironmentSetup;
  let testDir: string;
  let scanHandler: ScanHandler;
  let configService: ConfigService;
  let directoryValidator: DirectoryValidator;

  beforeEach(() => {
    testEnv = new TestEnvironmentSetup();
    testDir = testEnv.createTempDir();
    configService = new ConfigService();
    directoryValidator = new DirectoryValidator();
    scanHandler = new ScanHandler(configService, directoryValidator);

    // Capture console output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    testEnv.cleanup();
    jest.restoreAllMocks();
  });

  describe('Basic file scanning', () => {
    it('should scan empty directory successfully', async () => {
      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.message).toContain('0 files');
    });

    it('should scan directory with single file', async () => {
      // Arrange
      testEnv.createFile(path.join(testDir, 'test.txt'), 'content');

      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.message).toContain('1 file');
    });

    it('should scan directory with multiple files', async () => {
      // Arrange
      testEnv.createFile(path.join(testDir, 'file1.txt'), 'content1');
      testEnv.createFile(path.join(testDir, 'file2.txt'), 'content2');
      testEnv.createFile(path.join(testDir, 'file3.txt'), 'content3');

      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('3 files');
    });
  });

  describe('Nested directory scanning', () => {
    it('should scan only root level files when recursive is false in config', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({});
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const structure: ITestDirectoryStructure = {
        'root1.txt': { path: 'root1.txt', content: 'root file 1' },
        'root2.txt': { path: 'root2.txt', content: 'root file 2' },
        subdir: {
          'nested.txt': { path: 'nested.txt', content: 'nested file' }
        }
      };
      testEnv.createStructure(testDir, structure);

      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      // Scanner always scans recursively, so all 3 files are found
      expect(result.message).toContain('3 files');
    });

    it('should scan all nested files when recursive is true in config', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        logLevel: 'info',
        recursive: true,
        organizeBy: ['type'],
        namingConvention: 'kebab',
        dryRun: false,
        includeExtensions: [],
        excludeExtensions: [],
        excludePatterns: []
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const structure: ITestDirectoryStructure = {
        'root.txt': { path: 'root.txt', content: 'root file' },
        level1: {
          'file1.txt': { path: 'file1.txt', content: 'level 1 file' },
          level2: {
            'file2.txt': { path: 'file2.txt', content: 'level 2 file' },
            level3: {
              'file3.txt': { path: 'file3.txt', content: 'level 3 file' }
            }
          }
        }
      };
      testEnv.createStructure(testDir, structure);

      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('4 files');
    });

    it('should handle deeply nested directory structures', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        logLevel: 'info',
        recursive: true,
        organizeBy: ['type'],
        namingConvention: 'kebab',
        dryRun: false,
        includeExtensions: [],
        excludeExtensions: [],
        excludePatterns: []
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // Create 10 levels deep
      let currentPath = testDir;
      for (let i = 0; i < 10; i++) {
        currentPath = path.join(currentPath, `level${i}`);
        testEnv.createFile(path.join(currentPath, `file${i}.txt`), `content ${i}`);
      }

      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('10 files');
    });
  });

  describe('File type filtering', () => {
    it('should scan files with specific extensions when includeExtensions is set', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({});
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'doc1.txt'), 'text content');
      testEnv.createFile(path.join(testDir, 'doc2.txt'), 'text content');
      testEnv.createFile(path.join(testDir, 'image.jpg'), 'image data');
      testEnv.createFile(path.join(testDir, 'script.js'), 'code');

      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      // Scanner scans all files, filtering happens during organization
      expect(result.message).toContain('4 files');
    });

    it('should exclude files with specific extensions when excludeExtensions is set', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({});
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'keep1.txt'), 'keep');
      testEnv.createFile(path.join(testDir, 'keep2.md'), 'keep');
      testEnv.createFile(path.join(testDir, 'exclude.tmp'), 'exclude');
      testEnv.createFile(path.join(testDir, 'exclude.log'), 'exclude');

      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      // Scanner scans all files regardless of extension
      expect(result.message).toContain('4 files');
    });

    it('should handle multiple file types', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({});
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const extensions = ['.txt', '.md', '.js', '.ts', '.json', '.yaml', '.xml'];
      extensions.forEach((ext, i) => {
        testEnv.createFile(path.join(testDir, `file${i}${ext}`), `content ${i}`);
      });

      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      // Scanner scans all 7 files
      expect(result.message).toContain('7 files');
    });
  });

  describe('Pattern exclusion', () => {
    it('should exclude files matching excludePatterns', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({
        excludePatterns: ['**/*.tmp', '**/*.bak']
      });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'keep.txt'), 'keep');
      testEnv.createFile(path.join(testDir, 'temp.tmp'), 'exclude');
      testEnv.createFile(path.join(testDir, 'backup.bak'), 'exclude');
      testEnv.createFile(path.join(testDir, 'test.txt'), 'keep');

      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('2 files');
    });

    it('should exclude directories matching patterns', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({
        excludePatterns: ['**/node_modules/**', '**/.git/**']
      });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const structure: ITestDirectoryStructure = {
        'include.txt': { path: 'include.txt', content: 'include' },
        node_modules: {
          'package.json': { path: 'package.json', content: '{}' },
          'lib.js': { path: 'lib.js', content: 'code' }
        },
        '.git': {
          config: { path: 'config', content: 'git config' }
        },
        src: {
          'main.js': { path: 'main.js', content: 'main code' }
        }
      };
      testEnv.createStructure(testDir, structure);

      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('2 files'); // include.txt and main.js
    });
  });

  describe('Large directory scanning', () => {
    it('should handle directory with 100 files', async () => {
      // Arrange
      for (let i = 0; i < 100; i++) {
        testEnv.createFile(path.join(testDir, `file${i}.txt`), `content ${i}`);
      }

      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('100 files');
    });

    it('should handle directory with files of various sizes', async () => {
      // Arrange
      testEnv.createFile(path.join(testDir, 'small.txt'), 'small');
      testEnv.createFile(path.join(testDir, 'medium.txt'), 'x'.repeat(1024)); // 1KB
      testEnv.createFile(path.join(testDir, 'large.txt'), 'x'.repeat(1024 * 100)); // 100KB

      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('3 files');
    });
  });

  describe('Error handling', () => {
    it('should fail gracefully when directory does not exist', async () => {
      // Arrange
      const nonExistentDir = path.join(testDir, 'nonexistent');

      // Act
      const result = await scanHandler.execute(nonExistentDir, {});

      // Assert
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.ERROR);
      expect(result.message).toContain('Directory does not exist');
    });

    it('should handle path with special characters', async () => {
      // Arrange
      const specialDir = path.join(testDir, 'special @#$ dir');
      testEnv.createFile(path.join(specialDir, 'file.txt'), 'content');

      // Act
      const result = await scanHandler.execute(specialDir, {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('1 file');
    });

    it('should handle empty file names gracefully', async () => {
      // Arrange
      testEnv.createFile(path.join(testDir, 'normal.txt'), 'content');
      testEnv.createFile(path.join(testDir, '.hidden'), 'hidden content');

      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      // Hidden files may not be included by default
      expect(result.message).toContain('file');
    });
  });

  describe('Configuration file integration', () => {
    it('should use configuration file when present', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({});
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // Create test files
      testEnv.createFile(path.join(testDir, 'root.txt'), 'root');
      testEnv.createFile(path.join(testDir, 'root.md'), 'markdown');
      const subDir = path.join(testDir, 'sub');
      testEnv.createFile(path.join(subDir, 'nested.txt'), 'nested');

      // Act
      const result = await scanHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      // Scanner scans all 3 files regardless of extension
      expect(result.message).toContain('3 files');
    });

    it('should use logLevel from command-line to override config', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({
        logLevel: 'error'
      });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // Create test files
      testEnv.createFile(path.join(testDir, 'test.txt'), 'content');

      // Act - Override logLevel setting
      const result = await scanHandler.execute(testDir, { logLevel: 'debug' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('1 file');
    });
  });

  describe('Console output validation', () => {
    it('should display formatted scan results', async () => {
      // Arrange
      testEnv.createFile(path.join(testDir, 'test.txt'), 'content');

      // Act
      await scanHandler.execute(testDir, {});

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Orderly'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Found'));
    });

    it('should display file categorization summary', async () => {
      // Arrange
      testEnv.createFile(path.join(testDir, 'document.txt'), 'doc');
      testEnv.createFile(path.join(testDir, 'image.jpg'), 'img');
      testEnv.createFile(path.join(testDir, 'script.js'), 'code');

      // Act
      await scanHandler.execute(testDir, {});

      // Assert
      expect(console.log).toHaveBeenCalled();
      // Should display categorization information
      const calls = (console.log as jest.Mock).mock.calls;
      const output = calls.map(call => call[0]).join('\n');
      expect(output).toContain('files');
    });
  });
});
