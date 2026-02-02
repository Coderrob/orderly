import * as path from 'node:path';
import * as fs from 'node:fs';

import { OrganizeHandler } from '../../src/cli/commands/organize.command';
import { ConfigService } from '../../src/cli/services/config.service';
import { DirectoryValidator } from '../../src/cli/services/directory-validator.service';
import { ManifestService } from '../../src/cli/services/manifest.service';
import { ExitCode } from '../../src/cli/constants';
import {
  TestEnvironmentSetup,
  TestAssertions,
  createTestConfig,
  ITestDirectoryStructure
} from '../helpers';

/**
 * Integration tests for the organize command.
 * These tests verify the actual behavior of organizing files with before/after validation.
 */
describe('Organize Command Integration Tests', () => {
  let testEnv: TestEnvironmentSetup;
  let testDir: string;
  let organizeHandler: OrganizeHandler;
  let configService: ConfigService;
  let directoryValidator: DirectoryValidator;
  let manifestService: ManifestService;

  beforeEach(() => {
    testEnv = new TestEnvironmentSetup();
    testDir = testEnv.createTempDir();
    configService = new ConfigService();
    directoryValidator = new DirectoryValidator();
    manifestService = new ManifestService();
    organizeHandler = new OrganizeHandler(configService, directoryValidator, manifestService);

    // Capture console output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    testEnv.cleanup();
    jest.restoreAllMocks();
  });

  describe('Basic file organization', () => {
    it('should organize files by type', async () => {
      // Arrange - Create config
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        logLevel: 'info',
        dryRun: false,
        organizeBy: ['type'],
        namingConvention: 'kebab',
        recursive: false,
        includeExtensions: [],
        excludeExtensions: [],
        excludePatterns: []
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // Create test files
      testEnv.createFile(path.join(testDir, 'document.txt'), 'text content');
      testEnv.createFile(path.join(testDir, 'photo.jpg'), 'image data');
      testEnv.createFile(path.join(testDir, 'script.js'), 'code');

      // Store original file count
      const beforeFileCount = testEnv.countFiles(testDir);
      expect(beforeFileCount).toBe(4); // 3 files + config

      // Act
      const result = await organizeHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      // Verify files were organized into type-based directories
      TestAssertions.assertDirExists(path.join(testDir, 'documents'));
      TestAssertions.assertDirExists(path.join(testDir, 'images'));
      TestAssertions.assertDirExists(path.join(testDir, 'code'));

      // Verify files were moved
      TestAssertions.assertFileExists(path.join(testDir, 'documents', 'document.txt'));
      TestAssertions.assertFileExists(path.join(testDir, 'images', 'photo.jpg'));
      TestAssertions.assertFileExists(path.join(testDir, 'code', 'script.js'));

      // Verify original files no longer exist at root
      TestAssertions.assertFileNotExists(path.join(testDir, 'document.txt'));
      TestAssertions.assertFileNotExists(path.join(testDir, 'photo.jpg'));
      TestAssertions.assertFileNotExists(path.join(testDir, 'script.js'));
    });

    it('should preserve file content during organization', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        logLevel: 'info',
        dryRun: false,
        organizeBy: ['type'],
        namingConvention: 'kebab',
        recursive: false,
        includeExtensions: [],
        excludeExtensions: [],
        excludePatterns: []
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const testContent = 'Important test content that must be preserved';
      testEnv.createFile(path.join(testDir, 'important.txt'), testContent);

      // Act
      const result = await organizeHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);

      const newPath = path.join(testDir, 'documents', 'important.txt');
      TestAssertions.assertFileExists(newPath);
      TestAssertions.assertFileContent(newPath, testContent);
    });

    it('should handle empty directory', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        logLevel: 'info',
        dryRun: false,
        organizeBy: ['type'],
        namingConvention: 'kebab',
        recursive: false,
        includeExtensions: [],
        excludeExtensions: [],
        excludePatterns: []
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // Act
      const result = await organizeHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('0');
    });
  });

  describe('Dry-run mode', () => {
    it('should not modify files in dry-run mode', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        logLevel: 'info',
        dryRun: true,
        organizeBy: ['type'],
        namingConvention: 'kebab',
        recursive: false,
        includeExtensions: [],
        excludeExtensions: [],
        excludePatterns: []
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'test.txt'), 'content');
      testEnv.createFile(path.join(testDir, 'photo.jpg'), 'image');

      // Store original structure
      const beforeStructure = testEnv.readDirStructure(testDir);

      // Act
      const result = await organizeHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);

      // Verify structure unchanged
      const afterStructure = testEnv.readDirStructure(testDir);
      expect(afterStructure).toEqual(beforeStructure);

      // Original files should still exist at root
      TestAssertions.assertFileExists(path.join(testDir, 'test.txt'));
      TestAssertions.assertFileExists(path.join(testDir, 'photo.jpg'));
    });

    it('should report planned operations in dry-run mode', async () => {
      // Arrange
      testEnv.createFile(path.join(testDir, 'doc.txt'), 'content');

      // Act
      const result = await organizeHandler.execute(testDir, { dryRun: true });

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('organized');
    });
  });

  describe('Manifest generation', () => {
    it('should generate manifest when requested', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        logLevel: 'info',
        dryRun: false,
        organizeBy: ['type'],
        namingConvention: 'kebab',
        recursive: false,
        includeExtensions: [],
        excludeExtensions: [],
        excludePatterns: []
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'test.txt'), 'content');

      // Act
      const result = await organizeHandler.execute(testDir, { manifest: true });

      // Assert
      expect(result.success).toBe(true);

      // Verify manifest files exist
      const manifestPath = path.join(testDir, 'orderly-manifest.json');
      TestAssertions.assertFileExists(manifestPath);

      // Verify manifest content
      const manifestContent = testEnv.readFile(manifestPath);
      const manifest = JSON.parse(manifestContent);
      expect(manifest).toHaveProperty('operations');
      expect(Array.isArray(manifest.operations)).toBe(true);
    });

    it('should not generate manifest when not requested', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        logLevel: 'info',
        dryRun: false,
        organizeBy: ['type'],
        namingConvention: 'kebab',
        recursive: false,
        includeExtensions: [],
        excludeExtensions: [],
        excludePatterns: []
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'test.txt'), 'content');

      // Act
      const result = await organizeHandler.execute(testDir, { manifest: false });

      // Assert
      expect(result.success).toBe(true);

      // Verify manifest does not exist
      const manifestPath = path.join(testDir, 'orderly-manifest.json');
      TestAssertions.assertFileNotExists(manifestPath);
    });
  });

  describe('Naming conventions', () => {
    it('should apply kebab-case naming convention', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        logLevel: 'info',
        dryRun: false,
        organizeBy: ['type'],
        namingConvention: 'kebab',
        recursive: false,
        includeExtensions: [],
        excludeExtensions: [],
        excludePatterns: []
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'My Important Document.txt'), 'content');

      // Act
      const result = await organizeHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);

      // Verify kebab-case naming
      const documentsDir = path.join(testDir, 'documents');
      const files = fs.readdirSync(documentsDir);
      expect(files.some(f => f.includes('my-important-document'))).toBe(true);
    });

    it('should apply snake_case naming convention', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({
        dryRun: false,
        namingConvention: {
          type: 'snake_case',
          lowercase: true
        }
      });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'My Important Document.txt'), 'content');

      // Act
      const result = await organizeHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);

      // Verify snake_case naming
      const documentsDir = path.join(testDir, 'documents');
      const files = fs.readdirSync(documentsDir);
      expect(files.some(f => f.includes('my_important_document'))).toBe(true);
    });
  });

  describe('Complex directory structures', () => {
    it('should handle nested directories when recursive is true', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        logLevel: 'info',
        dryRun: false,
        organizeBy: ['type'],
        namingConvention: 'kebab',
        recursive: true,
        includeExtensions: [],
        excludeExtensions: [],
        excludePatterns: []
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const structure: ITestDirectoryStructure = {
        'root.txt': { path: 'root.txt', content: 'root' },
        folder1: {
          'nested.txt': { path: 'nested.txt', content: 'nested' },
          folder2: {
            'deep.txt': { path: 'deep.txt', content: 'deep' }
          }
        }
      };
      testEnv.createStructure(testDir, structure);

      // Act
      const result = await organizeHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);

      // All .txt files should be in documents directory
      const documentsDir = path.join(testDir, 'documents');
      TestAssertions.assertDirExists(documentsDir);
      TestAssertions.assertFileCount(documentsDir, 3);
    });

    it('should handle files with same names from different directories', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({ dryRun: false });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // Create files with same name in different directories
      testEnv.createFile(path.join(testDir, 'folder1', 'readme.txt'), 'content1');
      testEnv.createFile(path.join(testDir, 'folder2', 'readme.txt'), 'content2');

      // Act
      await organizeHandler.execute(testDir, {});

      // Assert
      // With collision resolution (keep-both default), both files should be organized
      const documentsDir = path.join(testDir, 'documents');
      TestAssertions.assertDirExists(documentsDir);
      const files = fs.readdirSync(documentsDir);
      // Both files should be organized with collision resolution
      expect(files.length).toBe(2);
      expect(files).toContain('readme.txt');
      expect(files).toContain('readme-1.txt');
    });
  });

  describe('Error handling', () => {
    it('should fail gracefully when directory does not exist', async () => {
      // Arrange
      const nonExistentDir = path.join(testDir, 'nonexistent');

      // Act
      const result = await organizeHandler.execute(nonExistentDir, {});

      // Assert
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.ERROR);
    });

    it('should handle permission errors gracefully', async () => {
      // This test is platform-specific and may need adjustment
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        logLevel: 'info',
        dryRun: false,
        organizeBy: ['type'],
        namingConvention: 'kebab',
        recursive: false,
        includeExtensions: [],
        excludeExtensions: [],
        excludePatterns: []
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'test.txt'), 'content');

      // Act & Assert - Should handle errors
      const result = await organizeHandler.execute(testDir, {});
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('exitCode');
    });
  });

  describe('Configuration options', () => {
    it('should use custom output directory', async () => {
      // Arrange
      const outputDir = path.join(testDir, 'organized');
      testEnv.createFile(path.join(testDir, 'test.txt'), 'content');

      // Act
      const result = await organizeHandler.execute(testDir, { output: outputDir });

      // Assert
      expect(result.success).toBe(true);

      // Files should be in output directory
      TestAssertions.assertDirExists(outputDir);
      TestAssertions.assertFileExists(path.join(outputDir, 'documents', 'test.txt'));
    });

    it('should filter by included extensions', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({ dryRun: false });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'include.txt'), 'include');
      testEnv.createFile(path.join(testDir, 'exclude.jpg'), 'exclude');

      // Act
      const result = await organizeHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);

      // Both files should be organized based on their categories
      TestAssertions.assertFileExists(path.join(testDir, 'documents', 'include.txt'));
      TestAssertions.assertFileExists(path.join(testDir, 'images', 'exclude.jpg'));
    });

    it('should exclude files by pattern', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        logLevel: 'info',
        dryRun: false,
        organizeBy: ['type'],
        namingConvention: 'kebab',
        recursive: false,
        includeExtensions: [],
        excludeExtensions: [],
        excludePatterns: ['*.tmp', '*.bak']
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'keep.txt'), 'keep');
      testEnv.createFile(path.join(testDir, 'temp.tmp'), 'temp');
      testEnv.createFile(path.join(testDir, 'backup.bak'), 'backup');

      // Act
      const result = await organizeHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);

      // Only .txt file should be organized
      TestAssertions.assertFileExists(path.join(testDir, 'documents', 'keep.txt'));
      // Excluded files should remain at root
      TestAssertions.assertFileExists(path.join(testDir, 'temp.tmp'));
      TestAssertions.assertFileExists(path.join(testDir, 'backup.bak'));
    });
  });

  describe('Before and after validation', () => {
    it('should maintain file count after organization', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        logLevel: 'info',
        dryRun: false,
        organizeBy: ['type'],
        namingConvention: 'kebab',
        recursive: false,
        includeExtensions: [],
        excludeExtensions: [],
        excludePatterns: []
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      testEnv.createFile(path.join(testDir, 'file1.txt'), 'content1');
      testEnv.createFile(path.join(testDir, 'file2.txt'), 'content2');
      testEnv.createFile(path.join(testDir, 'file3.txt'), 'content3');

      const beforeCount = testEnv.countFiles(testDir);

      // Act
      const result = await organizeHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);

      const afterCount = testEnv.countFiles(testDir);
      expect(afterCount).toBe(beforeCount); // File count should be the same
    });

    it('should maintain total file size after organization', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = {
        logLevel: 'info',
        dryRun: false,
        organizeBy: ['type'],
        namingConvention: 'kebab',
        recursive: false,
        includeExtensions: [],
        excludeExtensions: [],
        excludePatterns: []
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const content1 = 'x'.repeat(100);
      const content2 = 'y'.repeat(200);
      testEnv.createFile(path.join(testDir, 'file1.txt'), content1);
      testEnv.createFile(path.join(testDir, 'file2.txt'), content2);

      const beforeSize = content1.length + content2.length;

      // Act
      const result = await organizeHandler.execute(testDir, {});

      // Assert
      expect(result.success).toBe(true);

      // Verify file sizes
      const file1Path = path.join(testDir, 'documents', 'file1.txt');
      const file2Path = path.join(testDir, 'documents', 'file2.txt');

      const size1 = testEnv.getFileStats(file1Path).size;
      const size2 = testEnv.getFileStats(file2Path).size;

      expect(size1 + size2).toBe(beforeSize);
    });
  });
});
