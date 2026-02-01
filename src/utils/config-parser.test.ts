import { ConfigParser } from './config-parser';
import { FileSystemUtils } from './file-system-utils';
import * as yaml from 'js-yaml';
import { OrderlyConfig, ConfigFormat } from '../config/types';
import { LogLevel } from '../types';

jest.mock('./file-system-utils');
jest.mock('js-yaml');

describe('ConfigParser', () => {
  const mockFileSystemUtils = FileSystemUtils as jest.Mocked<typeof FileSystemUtils>;
  const mockYaml = yaml as jest.Mocked<typeof yaml>;

  let testContent: string;
  let testConfig: Partial<OrderlyConfig>;

  beforeEach(() => {
    testContent = 'test: config';
    testConfig = { logLevel: LogLevel.INFO, dryRun: false };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parse', () => {
    it.each([
      ['.json', 'JSON'],
      ['.JSON', 'JSON']
    ])('should parse %s file as %s', ext => {
      const jsonPath = `/config/test${ext}`;
      const jsonContent = JSON.stringify(testConfig);
      mockFileSystemUtils.readFileSync.mockReturnValue(jsonContent);

      const result = ConfigParser.parse(jsonPath);

      expect(result).toEqual(testConfig);
      expect(mockFileSystemUtils.readFileSync).toHaveBeenCalledWith(jsonPath);
    });

    it.each([
      ['.yml', 'YAML'],
      ['.yaml', 'YAML'],
      ['.YML', 'YAML'],
      ['.YAML', 'YAML']
    ])('should parse %s file as %s', ext => {
      const yamlPath = `/config/test${ext}`;
      mockFileSystemUtils.readFileSync.mockReturnValue(testContent);
      mockYaml.load.mockReturnValue(testConfig);

      const result = ConfigParser.parse(yamlPath);

      expect(result).toEqual(testConfig);
      expect(mockFileSystemUtils.readFileSync).toHaveBeenCalledWith(yamlPath);
      expect(mockYaml.load).toHaveBeenCalledWith(testContent);
    });

    it('should throw error for unsupported file format', () => {
      const unsupportedPath = '/config/test.txt';
      mockFileSystemUtils.readFileSync.mockReturnValue(testContent);

      expect(() => ConfigParser.parse(unsupportedPath)).toThrow(
        'Unsupported config file format: .txt'
      );
    });
  });

  describe('stringify', () => {
    it('should stringify config as JSON', () => {
      const config = testConfig as OrderlyConfig;
      const expected = JSON.stringify(config, null, 2);

      const result = ConfigParser.stringify(config, ConfigFormat.JSON);

      expect(result).toBe(expected);
    });

    it('should stringify config as YAML', () => {
      const config = testConfig as OrderlyConfig;
      const yamlOutput = 'test: config\n';
      mockYaml.dump.mockReturnValue(yamlOutput);

      const result = ConfigParser.stringify(config, ConfigFormat.YAML);

      expect(result).toBe(yamlOutput);
      expect(mockYaml.dump).toHaveBeenCalledWith(config);
    });

    it('should handle YAML format with complex objects', () => {
      const config = {
        categories: [{ name: 'docs', extensions: ['.txt'] }],
        namingConvention: { type: 'kebab-case', lowercase: true }
      } as OrderlyConfig;
      const yamlOutput = 'categories:\n  - name: docs\n';
      mockYaml.dump.mockReturnValue(yamlOutput);

      const result = ConfigParser.stringify(config, ConfigFormat.YAML);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should throw error for unsupported format', () => {
      const config = testConfig as OrderlyConfig;

      expect(() => ConfigParser.stringify(config, 'xml' as any)).toThrow(
        'Invalid format: xml, expected: json or yaml'
      );
    });
  });

  describe('instance methods', () => {
    let configParser: ConfigParser;

    beforeEach(() => {
      configParser = new ConfigParser();
    });

    describe('parse', () => {
      it('should delegate to static method', () => {
        const jsonPath = '/config/test.json';
        const jsonContent = JSON.stringify(testConfig);
        mockFileSystemUtils.readFileSync.mockReturnValue(jsonContent);

        const result = configParser.parse(jsonPath);

        expect(result).toEqual(testConfig);
        expect(mockFileSystemUtils.readFileSync).toHaveBeenCalledWith(jsonPath);
      });
    });

    describe('stringify', () => {
      it('should delegate to static method', () => {
        const config = testConfig as OrderlyConfig;
        const expected = JSON.stringify(config, null, 2);

        const result = configParser.stringify(config, ConfigFormat.JSON);

        expect(result).toBe(expected);
      });
    });
  });
});
