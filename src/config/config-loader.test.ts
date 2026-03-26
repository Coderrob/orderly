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
      mockFileSystemUtils.hasPath.mockReturnValue(true);
      mockConfigParser.parse.mockReturnValue({ success: true, value: testConfig });

      const result = ConfigLoader.load(testConfigPath);

      expect(result.logLevel).toBe(LogLevel.DEBUG);
      expect(result.dryRun).toBe(true);
      expect(mockFileSystemUtils.hasPath).toHaveBeenCalledWith(testConfigPath);
      expect(mockConfigParser.parse).toHaveBeenCalledWith(testConfigPath);
    });

    it('should throw error when specified config file does not exist', () => {
      mockFileSystemUtils.hasPath.mockReturnValue(false);

      expect(() => ConfigLoader.load(testConfigPath)).toThrow(
        `Config file not found: ${testConfigPath}`
      );
    });

    it('should load default config when no path specified and no config file found', () => {
      mockFileSystemUtils.hasPath.mockReturnValue(false);

      const result = ConfigLoader.load();

      expect(result).toMatchObject(DEFAULT_CONFIG);
    });

    it.each([['.orderly.yml'], ['.orderly.yaml'], ['orderly.config.json']])(
      'should find and load %s when no path specified',
      configFile => {
        mockFileSystemUtils.hasPath.mockImplementation((path: string) => path.endsWith(configFile));
        mockConfigParser.parse.mockReturnValue({ success: true, value: testConfig });

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
      mockFileSystemUtils.hasPath.mockReturnValue(true);
      mockConfigParser.parse.mockReturnValue({ success: true, value: { logLevel: LogLevel.WARN } });

      const result = ConfigLoader.load(testConfigPath);

      expect(result.logLevel).toBe(LogLevel.WARN);
      expect(result.categories).toBeDefined();
      expect(result.namingConvention).toBeDefined();
      expect(result.excludePatterns).toBeDefined();
    });

    it('should merge naming convention partially', () => {
      mockFileSystemUtils.hasPath.mockReturnValue(true);
      mockConfigParser.parse.mockReturnValue({
        success: true,
        value: { namingConvention: { type: NamingConventionType.SNAKE_CASE } }
      });

      const result = ConfigLoader.load(testConfigPath);

      expect(result.namingConvention.type).toBe(NamingConventionType.SNAKE_CASE);
      expect(result.namingConvention.lowercase).toBe(DEFAULT_CONFIG.namingConvention.lowercase);
    });

    it('should preserve default naming convention when not overridden', () => {
      mockFileSystemUtils.hasPath.mockReturnValue(true);
      mockConfigParser.parse.mockReturnValue({
        success: true,
        value: { logLevel: LogLevel.INFO } // Override something else, not namingConvention
      });

      const result = ConfigLoader.load(testConfigPath);

      expect(result.namingConvention).toEqual(DEFAULT_CONFIG.namingConvention);
      expect(result.logLevel).toBe(LogLevel.INFO);
    });

    it('should return default config when no config files found', () => {
      mockFileSystemUtils.hasPath.mockReturnValue(false);

      const result = ConfigLoader.load();

      expect(result).toEqual(DEFAULT_CONFIG);
      expect(mockFileSystemUtils.hasPath).toHaveBeenCalled();
    });

    it('should throw when parsing a discovered config fails', () => {
      mockFileSystemUtils.hasPath.mockImplementation((filePath: string) =>
        filePath.endsWith('.orderly.yml')
      );
      mockConfigParser.parse.mockReturnValue({
        success: false,
        error: new Error('parse failed')
      } as any);

      expect(() => ConfigLoader.load()).toThrow('parse failed');
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
      mockConfigParser.stringify.mockReturnValue({ success: true, value: stringified });

      ConfigLoader.save(config, filePath);

      expect(mockConfigParser.stringify).toHaveBeenCalledWith(config, format);
      expect(mockFileSystemUtils.writeFileSync).toHaveBeenCalledWith(filePath, stringified);
    });

    it('should throw when stringifying config fails', () => {
      mockConfigParser.stringify.mockReturnValue({
        success: false,
        error: new Error('stringify failed')
      } as any);

      expect(() => ConfigLoader.save(DEFAULT_CONFIG, '/config/test.json')).toThrow(
        'stringify failed'
      );
    });
  });

  describe('instance methods', () => {
    let configLoader: ConfigLoader;

    beforeEach(() => {
      configLoader = new ConfigLoader();
    });

    describe('load', () => {
      it('should delegate to static method', () => {
        mockFileSystemUtils.hasPath.mockReturnValue(true);
        mockConfigParser.parse.mockReturnValue({ success: true, value: testConfig });

        const result = configLoader.load(testConfigPath);

        expect(result.logLevel).toBe(LogLevel.DEBUG);
        expect(mockFileSystemUtils.hasPath).toHaveBeenCalledWith(testConfigPath);
      });
    });

    describe('save', () => {
      it('should delegate to static method', () => {
        const config = { ...DEFAULT_CONFIG, logLevel: LogLevel.DEBUG } as OrderlyConfig;
        const stringified = '{}';
        mockConfigParser.stringify.mockReturnValue({ success: true, value: stringified });

        configLoader.save(config, '/config/test.json');

        expect(mockConfigParser.stringify).toHaveBeenCalledWith(config, 'json');
        expect(mockFileSystemUtils.writeFileSync).toHaveBeenCalledWith(
          '/config/test.json',
          stringified
        );
      });
    });
  });
});
