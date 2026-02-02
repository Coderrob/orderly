import * as path from 'node:path';

import { InitHandler } from '../../src/cli/commands/init.command';
import { ExitCode } from '../../src/cli/constants';
import { TestEnvironmentSetup, TestAssertions } from '../helpers';

/**
 * Integration tests for the init command.
 * These tests verify the actual behavior of creating configuration files.
 */
describe('Init Command Integration Tests', () => {
  let testEnv: TestEnvironmentSetup;
  let testDir: string;
  let initHandler: InitHandler;

  beforeEach(() => {
    testEnv = new TestEnvironmentSetup();
    testDir = testEnv.createTempDir();
    initHandler = new InitHandler();

    // Change to test directory for config file creation
    process.chdir(testDir);
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  describe('JSON configuration creation', () => {
    it('should create a JSON configuration file with default settings', async () => {
      // Arrange
      const expectedConfigPath = path.join(testDir, '.orderly.config.json');

      // Act
      const result = await initHandler.execute({ format: 'json' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.message).toContain('.orderly.config.json');

      // Verify file was created
      TestAssertions.assertFileExists(expectedConfigPath);

      // Verify file contains valid JSON
      const content = testEnv.readFile(expectedConfigPath);
      const config = JSON.parse(content);

      // Verify default configuration structure
      expect(config).toHaveProperty('logLevel');
      expect(config).toHaveProperty('dryRun');
      expect(config).toHaveProperty('categories');
      expect(config).toHaveProperty('namingConvention');
    });

    it('should not overwrite existing JSON configuration file', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.json');
      const originalContent = '{"logLevel": "debug", "custom": true}';
      testEnv.createFile(configPath, originalContent);

      // Act
      const result = await initHandler.execute({ format: 'json' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.ERROR);
      expect(result.message).toContain('already exists');

      // Verify original file was not modified
      const actualContent = testEnv.readFile(configPath);
      expect(actualContent).toBe(originalContent);
    });

    it('should create configuration with valid default values', async () => {
      // Act
      const result = await initHandler.execute({ format: 'json' });

      // Assert
      expect(result.success).toBe(true);

      const configPath = path.join(testDir, '.orderly.config.json');
      const content = testEnv.readFile(configPath);
      const config = JSON.parse(content);

      // Verify specific default values
      expect(config.logLevel).toBe('info');
      expect(config.dryRun).toBe(false);
      expect(config.generateManifest).toBe(false);
      expect(Array.isArray(config.categories)).toBe(true);
    });
  });

  describe('YAML configuration creation', () => {
    it('should create a YAML configuration file with default settings', async () => {
      // Arrange
      const expectedConfigPath = path.join(testDir, '.orderly.config.yaml');

      // Act
      const result = await initHandler.execute({ format: 'yaml' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.message).toContain('.orderly.config.yaml');

      // Verify file was created
      TestAssertions.assertFileExists(expectedConfigPath);

      // Verify file contains YAML syntax
      const content = testEnv.readFile(expectedConfigPath);
      expect(content).toContain('logLevel:');
      expect(content).toContain('dryRun:');
      expect(content).toContain('categories:');
    });

    it('should not overwrite existing YAML configuration file', async () => {
      // Arrange
      const configPath = path.join(testDir, '.orderly.config.yaml');
      const originalContent = 'logLevel: debug\ncustom: true';
      testEnv.createFile(configPath, originalContent);

      // Act
      const result = await initHandler.execute({ format: 'yaml' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.ERROR);
      expect(result.message).toContain('already exists');

      // Verify original file was not modified
      const actualContent = testEnv.readFile(configPath);
      expect(actualContent).toBe(originalContent);
    });

    it('should handle yml extension format', async () => {
      // Act
      const result = await initHandler.execute({ format: 'yml' });

      // Assert
      expect(result.success).toBe(true);

      const configPath = path.join(testDir, '.orderly.config.yaml');
      TestAssertions.assertFileExists(configPath);
    });
  });

  describe('Format validation', () => {
    it('should default to YAML when no format specified', async () => {
      // Act
      const result = await initHandler.execute({});

      // Assert
      expect(result.success).toBe(true);

      const yamlConfigPath = path.join(testDir, '.orderly.config.yaml');
      TestAssertions.assertFileExists(yamlConfigPath);
    });

    it('should handle uppercase format specification', async () => {
      // Act
      const result = await initHandler.execute({ format: 'JSON' as any });

      // Assert
      expect(result.success).toBe(true);

      const configPath = path.join(testDir, '.orderly.config.json');
      TestAssertions.assertFileExists(configPath);
    });

    it('should handle mixed case format specification', async () => {
      // Act
      const result = await initHandler.execute({ format: 'YaML' as any });

      // Assert
      expect(result.success).toBe(true);

      const configPath = path.join(testDir, '.orderly.config.yaml');
      TestAssertions.assertFileExists(configPath);
    });
  });

  describe('Error handling', () => {
    it('should handle init execution gracefully', async () => {
      // Act - Even in error scenarios, should return structured result
      const result = await initHandler.execute({ format: 'json' });

      // Assert - Result should always have expected structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('exitCode');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.exitCode).toBe('number');
    });
  });

  describe('Configuration content validation', () => {
    it('should create configuration with all required fields', async () => {
      // Act
      const result = await initHandler.execute({ format: 'json' });

      // Assert
      expect(result.success).toBe(true);

      const configPath = path.join(testDir, '.orderly.config.json');
      const content = testEnv.readFile(configPath);
      const config = JSON.parse(content);

      // Verify all required fields are present
      const requiredFields = [
        'logLevel',
        'dryRun',
        'categories',
        'namingConvention',
        'includeHidden',
        'generateManifest',
        'excludePatterns'
      ];

      requiredFields.forEach(field => {
        expect(config).toHaveProperty(field);
      });
    });

    it('should create configuration with proper structure', async () => {
      // Act
      const result = await initHandler.execute({ format: 'json' });

      // Assert
      expect(result.success).toBe(true);

      const configPath = path.join(testDir, '.orderly.config.json');
      const content = testEnv.readFile(configPath);
      const config = JSON.parse(content);

      // Verify categories have proper structure
      expect(Array.isArray(config.categories)).toBe(true);
      if (config.categories.length > 0) {
        expect(config.categories[0]).toHaveProperty('name');
        expect(config.categories[0]).toHaveProperty('extensions');
      }
    });
  });

  describe('Multiple init attempts', () => {
    it('should allow creating JSON config when YAML exists (different files)', async () => {
      // Arrange - Create YAML config first
      await initHandler.execute({ format: 'yaml' });

      // Act - Try to create JSON config
      const result = await initHandler.execute({ format: 'json' });

      // Assert
      expect(result.success).toBe(true); // JSON config can be created alongside YAML

      // Both files should exist
      TestAssertions.assertFileExists(path.join(testDir, '.orderly.config.yaml'));
      TestAssertions.assertFileExists(path.join(testDir, '.orderly.config.json'));
    });
  });
});
