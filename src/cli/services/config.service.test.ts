import { ConfigService } from './config.service';
import { ConfigLoader } from '../../config/config-loader';
import { LogLevel } from '../../types';
import { DedupeAction, DedupeMode } from '../../dedupe/types';
import { NamingConventionType } from '../../config/types';

jest.mock('../../config/config-loader');

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
  });
});
