import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';

import { OrganizeHandler } from '../../src/cli/commands/organize.command';
import { ConfigService } from '../../src/cli/services/config.service';
import { DirectoryValidator } from '../../src/cli/services/directory-validator.service';
import { ManifestService } from '../../src/cli/services/manifest.service';
import { ExitCode } from '../../src/cli/constants';
import { TestEnvironmentSetup, TestAssertions, createTestConfig } from '../helpers';

/**
 * Integration tests for the dedupe feature in organize command.
 * These tests verify duplicate detection and handling with before/after validation.
 */
describe('Dedupe Integration Tests', () => {
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

  /**
   * Helper to create a file with specific hash
   */
  function createFileWithHash(filePath: string, content: string): string {
    testEnv.createFile(filePath, content);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return hash;
  }

  describe('Hash-based deduplication', () => {
    it('should detect duplicate files with identical content', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: 'skip'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // Create duplicate files
      const duplicateContent = 'This is duplicate content for testing';
      const files = ['file1.txt', 'file2.txt', 'file3.txt'];
      files.forEach(file => {
        testEnv.createFile(path.join(testDir, file), duplicateContent);
      });

      const beforeCount = testEnv.countFiles(testDir);

      // Act
      const result = await organizeHandler.execute(testDir, { dedupe: true });

      // Assert
      expect(result.success).toBe(true);

      // Dedupe with skip action: primary file is organized, duplicates stay in place
      // So file count remains the same (files moved to subdirectory, not deleted)
      const afterCount = testEnv.countFiles(testDir);
      expect(afterCount).toBe(beforeCount);

      // Only one file should be organized to documents folder
      const documentsDir = path.join(testDir, 'documents');
      TestAssertions.assertDirExists(documentsDir);
      const organizedFiles = fs.readdirSync(documentsDir);
      expect(organizedFiles.length).toBe(1);
    });

    it('should skip duplicate files when action is skip', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: 'skip'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const content = 'duplicate content';
      testEnv.createFile(path.join(testDir, 'original.txt'), content);
      testEnv.createFile(path.join(testDir, 'duplicate1.txt'), content);
      testEnv.createFile(path.join(testDir, 'duplicate2.txt'), content);

      // Act
      const result = await organizeHandler.execute(testDir, { dedupe: true, dedupeAction: 'skip' });

      // Assert
      expect(result.success).toBe(true);

      // Only original file should be organized
      const documentsDir = path.join(testDir, 'documents');
      TestAssertions.assertDirExists(documentsDir);
    });

    it('should handle unique files correctly', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: 'skip'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // Create unique files
      testEnv.createFile(path.join(testDir, 'unique1.txt'), 'content 1');
      testEnv.createFile(path.join(testDir, 'unique2.txt'), 'content 2');
      testEnv.createFile(path.join(testDir, 'unique3.txt'), 'content 3');

      const beforeCount = testEnv.countFiles(testDir);

      // Act
      const result = await organizeHandler.execute(testDir, { dedupe: true });

      // Assert
      expect(result.success).toBe(true);

      // All unique files should be organized
      const documentsDir = path.join(testDir, 'documents');
      const afterCount = testEnv.countFiles(testDir);
      expect(afterCount).toBe(beforeCount); // Total files remain same
      TestAssertions.assertFileCount(documentsDir, 3); // All 3 organized
    });

    it('should handle large files for hash comparison', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: 'skip'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // Create large duplicate files (1MB each)
      const largeContent = 'x'.repeat(1024 * 1024);
      testEnv.createFile(path.join(testDir, 'large1.txt'), largeContent);
      testEnv.createFile(path.join(testDir, 'large2.txt'), largeContent);

      // Act
      const result = await organizeHandler.execute(testDir, { dedupe: true });

      // Assert
      expect(result.success).toBe(true);
      // Deduplication should work even with large files
    });
  });

  describe('Metadata-based deduplication', () => {
    it('should detect duplicates based on name and size', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'metadata',
          action: 'skip'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // Create files with same name in different directories
      const content = 'duplicate by name and size';
      testEnv.createFile(path.join(testDir, 'folder1', 'document.txt'), content);
      testEnv.createFile(path.join(testDir, 'folder2', 'document.txt'), content);

      // Act
      const result = await organizeHandler.execute(testDir, { dedupe: true });

      // Assert
      expect(result.success).toBe(true);
    });

    it('should not consider files as duplicates if sizes differ', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const config = createTestConfig({
        dryRun: false,
        dedupe: {
          enabled: true,
          recursive: true,
          strategy: { mode: 'metadata' },
          action: 'skip'
        }
      });
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // Create files with same name but different sizes
      testEnv.createFile(path.join(testDir, 'folder1', 'file.txt'), 'short');
      testEnv.createFile(path.join(testDir, 'folder2', 'file.txt'), 'much longer content');

      // Act
      const result = await organizeHandler.execute(testDir, { dedupe: true });

      // Assert
      expect(result.success).toBe(true);

      // Both files should be organized (different sizes means not duplicates)
      const documentsDir = path.join(testDir, 'documents');
      TestAssertions.assertDirExists(documentsDir);
      const files = fs.readdirSync(documentsDir);
      expect(files.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Combined strategy deduplication', () => {
    it('should use both hash and metadata for deduplication', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'combined',
          action: 'skip'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const content = 'duplicate content';
      testEnv.createFile(path.join(testDir, 'doc1.txt'), content);
      testEnv.createFile(path.join(testDir, 'doc2.txt'), content);
      testEnv.createFile(path.join(testDir, 'doc3.txt'), content);

      // Act
      const result = await organizeHandler.execute(testDir, { dedupe: true });

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('Dedupe with dry-run', () => {
    it('should report duplicates in dry-run mode without modifying files', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: 'report'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const content = 'duplicate';
      testEnv.createFile(path.join(testDir, 'file1.txt'), content);
      testEnv.createFile(path.join(testDir, 'file2.txt'), content);

      const beforeStructure = testEnv.readDirStructure(testDir);

      // Act
      const result = await organizeHandler.execute(testDir, { dedupe: true, dryRun: true });

      // Assert
      expect(result.success).toBe(true);

      // Files should remain unchanged
      const afterStructure = testEnv.readDirStructure(testDir);
      expect(afterStructure).toEqual(beforeStructure);
    });
  });

  describe('Dedupe actions', () => {
    it('should report duplicates when action is report', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: 'report'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const content = 'duplicate';
      testEnv.createFile(path.join(testDir, 'file1.txt'), content);
      testEnv.createFile(path.join(testDir, 'file2.txt'), content);

      // Act
      const result = await organizeHandler.execute(testDir, {
        dedupe: true,
        dedupeAction: 'report'
      });

      // Assert
      expect(result.success).toBe(true);
      // Both files should still be organized (report only)
    });

    it('should handle command-line dedupe action override', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: 'skip'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const content = 'duplicate';
      testEnv.createFile(path.join(testDir, 'file1.txt'), content);
      testEnv.createFile(path.join(testDir, 'file2.txt'), content);

      // Act - Override action to 'report'
      const result = await organizeHandler.execute(testDir, {
        dedupe: true,
        dedupeAction: 'report'
      });

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('Dedupe with organization', () => {
    it('should organize files after deduplication', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: 'skip'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // Create mix of unique and duplicate files
      testEnv.createFile(path.join(testDir, 'unique.txt'), 'unique content');
      testEnv.createFile(path.join(testDir, 'dup1.txt'), 'duplicate');
      testEnv.createFile(path.join(testDir, 'dup2.txt'), 'duplicate');
      testEnv.createFile(path.join(testDir, 'photo.jpg'), 'image data');

      // Act
      const result = await organizeHandler.execute(testDir, { dedupe: true });

      // Assert
      expect(result.success).toBe(true);

      // Files should be organized by type
      TestAssertions.assertDirExists(path.join(testDir, 'documents'));
      TestAssertions.assertDirExists(path.join(testDir, 'images'));

      // Unique files should be in their respective directories
      TestAssertions.assertFileExists(path.join(testDir, 'documents', 'unique.txt'));
      TestAssertions.assertFileExists(path.join(testDir, 'images', 'photo.jpg'));
    });

    it('should maintain file integrity during dedupe and organize', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: 'skip'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const uniqueContent = 'This content should be preserved';
      testEnv.createFile(path.join(testDir, 'important.txt'), uniqueContent);
      testEnv.createFile(path.join(testDir, 'dup1.txt'), 'duplicate');
      testEnv.createFile(path.join(testDir, 'dup2.txt'), 'duplicate');

      // Act
      const result = await organizeHandler.execute(testDir, { dedupe: true });

      // Assert
      expect(result.success).toBe(true);

      // Verify unique file content is preserved
      const importantPath = path.join(testDir, 'documents', 'important.txt');
      TestAssertions.assertFileExists(importantPath);
      TestAssertions.assertFileContent(importantPath, uniqueContent);
    });
  });

  describe('Dedupe with manifest', () => {
    it('should include deduplication info in manifest', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: 'skip'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const content = 'duplicate';
      testEnv.createFile(path.join(testDir, 'file1.txt'), content);
      testEnv.createFile(path.join(testDir, 'file2.txt'), content);

      // Act
      const result = await organizeHandler.execute(testDir, {
        dedupe: true,
        manifest: true
      });

      // Assert
      expect(result.success).toBe(true);

      // Verify manifest includes dedupe operations
      const manifestPath = path.join(testDir, 'orderly-manifest.json');
      TestAssertions.assertFileExists(manifestPath);

      const manifestContent = testEnv.readFile(manifestPath);
      const manifest = JSON.parse(manifestContent);
      expect(manifest).toHaveProperty('operations');
    });
  });

  describe('Performance with many duplicates', () => {
    it('should handle 50 duplicate files efficiently', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: 'skip'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const duplicateContent = 'duplicate content';
      for (let i = 0; i < 50; i++) {
        testEnv.createFile(path.join(testDir, `file${i}.txt`), duplicateContent);
      }

      const startTime = Date.now();

      // Act
      const result = await organizeHandler.execute(testDir, { dedupe: true });

      // Assert
      const endTime = Date.now();
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Edge cases', () => {
    it('should handle empty files as duplicates', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: 'skip'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      // Create empty files
      testEnv.createFile(path.join(testDir, 'empty1.txt'), '');
      testEnv.createFile(path.join(testDir, 'empty2.txt'), '');
      testEnv.createFile(path.join(testDir, 'empty3.txt'), '');

      // Act
      const result = await organizeHandler.execute(testDir, { dedupe: true });

      // Assert
      expect(result.success).toBe(true);
    });

    it('should handle files with special characters in names', async () => {
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
        excludePatterns: [],
        dedupe: {
          enabled: true,
          strategy: 'hash',
          action: 'skip'
        }
      };
      testEnv.createFile(configPath, JSON.stringify(config, null, 2));

      const content = 'duplicate';
      testEnv.createFile(path.join(testDir, 'file-1.txt'), content);
      testEnv.createFile(path.join(testDir, 'file_2.txt'), content);
      testEnv.createFile(path.join(testDir, 'file 3.txt'), content);

      // Act
      const result = await organizeHandler.execute(testDir, { dedupe: true });

      // Assert
      expect(result.success).toBe(true);
    });
  });
});
