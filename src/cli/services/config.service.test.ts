import { ConfigService } from './config.service';
import { ConfigLoader } from '../../config/config-loader';
import { LogLevel } from '../../types';
import { DedupeAction, DedupeMode } from '../../dedupe/types';
import { NamingConventionType } from '../../config/types';
import { CONFIG_FILE_NAMES } from '../../constants';
import * as fs from 'node:fs';
import * as path from 'node:path';

jest.mock('../../config/config-loader');
jest.mock('node:fs');

describe('ConfigService', () => {
  let configService: ConfigService;
  let mockConfigLoader: jest.Mocked<typeof ConfigLoader>;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = new ConfigService();
    mockConfigLoader = ConfigLoader as jest.Mocked<typeof ConfigLoader>;
  });

  describe('loadWithOverrides', () => {
    it('should load config from specified path', () => {
      const mockConfig = {
        categories: [],
        namingConvention: { type: NamingConventionType.KEBAB_CASE, lowercase: true },
        excludePatterns: [],
        includeHidden: false,
        dryRun: false,
        generateManifest: false,
        logLevel: LogLevel.INFO,
        targetDirectory: undefined
      };

      mockConfigLoader.load.mockReturnValue(mockConfig);

      const result = configService.loadWithOverrides({ config: '/path/to/config.json' });

      expect(mockConfigLoader.load).toHaveBeenCalledWith('/path/to/config.json');
      expect(result).toStrictEqual(mockConfig);
    });

    it('should load default config when no path specified', () => {
      const mockConfig = {
        categories: [],
        namingConvention: { type: NamingConventionType.KEBAB_CASE, lowercase: true },
        excludePatterns: [],
        includeHidden: false,
        dryRun: false,
        generateManifest: false,
        logLevel: LogLevel.INFO,
        targetDirectory: undefined
      };

      mockConfigLoader.load.mockReturnValue(mockConfig);

      const result = configService.loadWithOverrides({});

      expect(mockConfigLoader.load).toHaveBeenCalledWith();
      expect(result).toStrictEqual(mockConfig);
    });

    it('should apply log level override', () => {
      const baseConfig = {
        categories: [],
        namingConvention: { type: NamingConventionType.KEBAB_CASE, lowercase: true },
        excludePatterns: [],
        includeHidden: false,
        dryRun: false,
        generateManifest: false,
        logLevel: LogLevel.INFO
      };

      mockConfigLoader.load.mockReturnValue(baseConfig);

      const result = configService.loadWithOverrides({ logLevel: 'debug' });

      expect(result.logLevel).toBe(LogLevel.DEBUG);
    });

    it('should ignore invalid log level', () => {
      const baseConfig = {
        categories: [],
        namingConvention: { type: NamingConventionType.KEBAB_CASE, lowercase: true },
        excludePatterns: [],
        includeHidden: false,
        dryRun: false,
        generateManifest: false,
        logLevel: LogLevel.INFO
      };

      mockConfigLoader.load.mockReturnValue(baseConfig);

      const result = configService.loadWithOverrides({ logLevel: 'invalid' });

      expect(result.logLevel).toBe(LogLevel.INFO);
    });

    it('should apply dry run override', () => {
      const baseConfig = {
        categories: [],
        namingConvention: { type: NamingConventionType.KEBAB_CASE, lowercase: true },
        excludePatterns: [],
        includeHidden: false,
        dryRun: false,
        generateManifest: false,
        logLevel: LogLevel.INFO
      };

      mockConfigLoader.load.mockReturnValue(baseConfig);

      const result = configService.loadWithOverrides({ dryRun: true });

      expect(result.dryRun).toBe(true);
    });

    it('should resolve output directories to absolute targetDirectory values', () => {
      const baseConfig = {
        categories: [],
        namingConvention: { type: NamingConventionType.KEBAB_CASE, lowercase: true },
        excludePatterns: [],
        includeHidden: false,
        dryRun: false,
        generateManifest: false,
        logLevel: LogLevel.INFO
      };

      mockConfigLoader.load.mockReturnValue(baseConfig);

      const result = configService.loadWithOverrides({ output: './organized' });

      expect(result.targetDirectory).toContain('organized');
    });

    it('should apply dedupe configuration', () => {
      const baseConfig = {
        categories: [],
        namingConvention: { type: NamingConventionType.KEBAB_CASE, lowercase: true },
        excludePatterns: [],
        includeHidden: false,
        dryRun: false,
        generateManifest: false,
        logLevel: LogLevel.INFO
      };

      mockConfigLoader.load.mockReturnValue(baseConfig);

      const result = configService.loadWithOverrides({ dedupe: true, dedupeAction: 'report' });

      expect(result.dedupe).toEqual({
        enabled: true,
        recursive: false,
        strategy: { mode: DedupeMode.ANY },
        action: DedupeAction.REPORT
      });
    });

    it('should apply dedupe action override', () => {
      const baseConfig = {
        categories: [],
        namingConvention: { type: NamingConventionType.KEBAB_CASE, lowercase: true },
        excludePatterns: [],
        includeHidden: false,
        dryRun: false,
        generateManifest: false,
        logLevel: LogLevel.INFO,
        dedupe: {
          enabled: true,
          recursive: false,
          strategy: { mode: DedupeMode.ANY },
          action: DedupeAction.SKIP
        }
      };

      mockConfigLoader.load.mockReturnValue(baseConfig);

      const result = configService.loadWithOverrides({ dedupeAction: 'replace' });

      expect(result.dedupe?.action).toBe(DedupeAction.REPLACE);
    });

    it('should ignore invalid dedupe action', () => {
      const baseConfig = {
        categories: [],
        namingConvention: { type: NamingConventionType.KEBAB_CASE, lowercase: true },
        excludePatterns: [],
        includeHidden: false,
        dryRun: false,
        generateManifest: false,
        logLevel: LogLevel.INFO,
        dedupe: {
          enabled: true,
          recursive: false,
          strategy: { mode: DedupeMode.ANY },
          action: DedupeAction.SKIP
        }
      };

      mockConfigLoader.load.mockReturnValue(baseConfig);

      const result = configService.loadWithOverrides({ dedupeAction: 'invalid' });

      expect(result.dedupe?.action).toBe(DedupeAction.SKIP);
    });

    it('should disable dedupe when the CLI override sets dedupe to false', () => {
      const baseConfig = {
        categories: [],
        namingConvention: { type: NamingConventionType.KEBAB_CASE, lowercase: true },
        excludePatterns: [],
        includeHidden: false,
        dryRun: false,
        generateManifest: false,
        logLevel: LogLevel.INFO,
        dedupe: {
          enabled: true,
          recursive: false,
          strategy: { mode: DedupeMode.ANY },
          action: DedupeAction.SKIP
        }
      };

      mockConfigLoader.load.mockReturnValue(baseConfig);

      const result = configService.loadWithOverrides({ dedupe: false });

      expect(result.dedupe?.enabled).toBe(false);
    });
  });

  describe('findConfigInDirectory', () => {
    const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;

    beforeEach(() => {
      mockExistsSync.mockReset();
    });

    it('should find .orderly.yml', () => {
      mockExistsSync.mockImplementation((filePath: fs.PathLike) => {
        return filePath === path.join('/test/dir', '.orderly.yml');
      });

      const result = configService.findConfigInDirectory('/test/dir');

      expect(result).toBe(path.join('/test/dir', '.orderly.yml'));
      expect(mockExistsSync).toHaveBeenCalledWith(path.join('/test/dir', '.orderly.yml'));
    });

    it('should find .orderly.yaml', () => {
      mockExistsSync.mockImplementation((filePath: fs.PathLike) => {
        return filePath === path.join('/test/dir', '.orderly.yaml');
      });

      const result = configService.findConfigInDirectory('/test/dir');

      expect(result).toBe(path.join('/test/dir', '.orderly.yaml'));
    });

    it('should find orderly.config.json', () => {
      mockExistsSync.mockImplementation((filePath: fs.PathLike) => {
        return filePath === path.join('/test/dir', 'orderly.config.json');
      });

      const result = configService.findConfigInDirectory('/test/dir');

      expect(result).toBe(path.join('/test/dir', 'orderly.config.json'));
    });

    it('should find .orderly.config.yaml', () => {
      mockExistsSync.mockImplementation((filePath: fs.PathLike) => {
        return filePath === path.join('/test/dir', '.orderly.config.yaml');
      });

      const result = configService.findConfigInDirectory('/test/dir');

      expect(result).toBe(path.join('/test/dir', '.orderly.config.yaml'));
    });

    it('should find .orderly.config.json', () => {
      mockExistsSync.mockImplementation((filePath: fs.PathLike) => {
        return filePath === path.join('/test/dir', '.orderly.config.json');
      });

      const result = configService.findConfigInDirectory('/test/dir');

      expect(result).toBe(path.join('/test/dir', '.orderly.config.json'));
    });

    it('should prioritize .orderly.yml over other config files', () => {
      mockExistsSync.mockImplementation((filePath: fs.PathLike) => {
        const pathStr = filePath.toString();
        return pathStr.includes('.orderly.yml') || pathStr.includes('orderly.config.json');
      });

      const result = configService.findConfigInDirectory('/test/dir');

      expect(result).toBe(path.join('/test/dir', '.orderly.yml'));
    });

    it('should return null if no config file found', () => {
      mockExistsSync.mockReturnValue(false);

      const result = configService.findConfigInDirectory('/test/dir');

      expect(result).toBeNull();
      expect(mockExistsSync).toHaveBeenCalledTimes(CONFIG_FILE_NAMES.length);
    });
  });

  describe('private helpers', () => {
    it('should preserve the base config when no dedupe override is provided', () => {
      const baseConfig = {
        categories: [],
        namingConvention: { type: NamingConventionType.KEBAB_CASE, lowercase: true },
        excludePatterns: [],
        includeHidden: false,
        dryRun: false,
        generateManifest: false,
        logLevel: LogLevel.INFO
      };

      const result = (configService as any).withOptionalDedupeOverride(baseConfig, baseConfig, {});

      expect(result).toEqual(baseConfig);
      expect(result).not.toBe(baseConfig);
    });

    it('should resolve all supported log levels', () => {
      expect((configService as any).resolveLogLevel('info')).toBe(LogLevel.INFO);
      expect((configService as any).resolveLogLevel('warn')).toBe(LogLevel.WARN);
      expect((configService as any).resolveLogLevel('error')).toBe(LogLevel.ERROR);
    });

    it('should resolve all supported dedupe actions', () => {
      expect((configService as any).resolveDedupeAction('skip')).toBe(DedupeAction.SKIP);
      expect((configService as any).resolveDedupeAction('report')).toBe(DedupeAction.REPORT);
      expect((configService as any).resolveDedupeAction('replace')).toBe(DedupeAction.REPLACE);
    });

    it('should create a default dedupe config when no base config exists', () => {
      const result = (configService as any).createDedupeConfig(undefined, undefined, undefined);

      expect(result).toEqual({
        enabled: true,
        recursive: false,
        strategy: { mode: DedupeMode.ANY },
        action: DedupeAction.SKIP
      });
    });

    it('should prefer explicit action and enabled overrides when creating dedupe config', () => {
      const result = (configService as any).createDedupeConfig(
        {
          enabled: true,
          recursive: true,
          strategy: { mode: DedupeMode.ALL },
          action: DedupeAction.SKIP
        },
        false,
        DedupeAction.REPLACE
      );

      expect(result).toEqual({
        enabled: false,
        recursive: true,
        strategy: { mode: DedupeMode.ALL },
        action: DedupeAction.REPLACE
      });
    });
  });
});
