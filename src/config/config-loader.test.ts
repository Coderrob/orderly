import { ConfigLoader } from './config-loader';
import { FileSystemUtils } from '../utils/file-system-utils';
import { ConfigParser } from '../utils/config-parser';
import { DEFAULT_CONFIG, OrderlyConfig, NamingConventionType } from './types';
import { LogLevel } from '../types';

jest.mock('../utils/file-system-utils');
jest.mock('../utils/config-parser');

describe('ConfigLoader', () => {
  const mockFileSystemUtils = FileSystemUtils as jest.Mocked<typeof FileSystemUtils>;
  const mockConfigParser = ConfigParser as jest.Mocked<typeof ConfigParser>;

  let testConfigPath: string;
  let testConfig: Partial<OrderlyConfig>;

  beforeEach(() => {
    testConfigPath = '/config/test.yml';
    testConfig = {
      logLevel: LogLevel.DEBUG,
      dryRun: true,
      generateManifest: false
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('load', () => {
    it('should load config from specified path when file exists', () => {
      mockFileSystemUtils.existsSync.mockReturnValue(true);
      mockConfigParser.parse.mockReturnValue(testConfig);

      const result = ConfigLoader.load(testConfigPath);

      expect(result.logLevel).toBe(LogLevel.DEBUG);
      expect(result.dryRun).toBe(true);
      expect(mockFileSystemUtils.existsSync).toHaveBeenCalledWith(testConfigPath);
      expect(mockConfigParser.parse).toHaveBeenCalledWith(testConfigPath);
    });

    it('should throw error when specified config file does not exist', () => {
      mockFileSystemUtils.existsSync.mockReturnValue(false);

      expect(() => ConfigLoader.load(testConfigPath)).toThrow(
        `Config file not found: ${testConfigPath}`
      );
    });

    it('should load default config when no path specified and no config file found', () => {
      mockFileSystemUtils.existsSync.mockReturnValue(false);

      const result = ConfigLoader.load();

      expect(result).toMatchObject(DEFAULT_CONFIG);
    });

    it.each([['.orderly.yml'], ['.orderly.yaml'], ['orderly.config.json']])(
      'should find and load %s when no path specified',
      configFile => {
        mockFileSystemUtils.existsSync.mockImplementation((path: string) =>
          path.endsWith(configFile)
        );
        mockConfigParser.parse.mockReturnValue(testConfig);

        const result = ConfigLoader.load();

        expect(result.logLevel).toBe('debug');
        expect(mockConfigParser.parse).toHaveBeenCalledTimes(1);
        expect(mockConfigParser.parse).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining(configFile)
        );
      }
    );

    it('should merge config with defaults preserving all fields', () => {
      mockFileSystemUtils.existsSync.mockReturnValue(true);
      mockConfigParser.parse.mockReturnValue({ logLevel: LogLevel.WARN });

      const result = ConfigLoader.load(testConfigPath);

      expect(result.logLevel).toBe(LogLevel.WARN);
      expect(result.categories).toBeDefined();
      expect(result.namingConvention).toBeDefined();
      expect(result.excludePatterns).toBeDefined();
    });

    it('should merge naming convention partially', () => {
      mockFileSystemUtils.existsSync.mockReturnValue(true);
      mockConfigParser.parse.mockReturnValue({
        namingConvention: { type: NamingConventionType.SNAKE_CASE }
      });

      const result = ConfigLoader.load(testConfigPath);

      expect(result.namingConvention.type).toBe(NamingConventionType.SNAKE_CASE);
      expect(result.namingConvention.lowercase).toBe(DEFAULT_CONFIG.namingConvention.lowercase);
    });
  });

  describe('save', () => {
    it.each([
      ['/config/test.json', 'json'],
      ['/config/test.JSON', 'json'],
      ['/config/test.yml', 'yaml'],
      ['/config/test.yaml', 'yaml']
    ])('should save config to %s with %s format', (filePath, format) => {
      const config = { ...DEFAULT_CONFIG, logLevel: LogLevel.DEBUG } as OrderlyConfig;
      const stringified = format === 'json' ? '{}' : 'test: config';
      mockConfigParser.stringify.mockReturnValue(stringified);

      ConfigLoader.save(config, filePath);

      expect(mockConfigParser.stringify).toHaveBeenCalledWith(config, format);
      expect(mockFileSystemUtils.writeFileSync).toHaveBeenCalledWith(filePath, stringified);
    });
  });
});
