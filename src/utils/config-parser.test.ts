import { ConfigParser } from './config-parser';
import { FileSystemUtils } from './file-system-utils';
import * as yaml from 'js-yaml';
import { OrderlyConfig } from '../config/types';

jest.mock('./file-system-utils');
jest.mock('js-yaml');

describe('ConfigParser', () => {
  const mockFileSystemUtils = FileSystemUtils as jest.Mocked<typeof FileSystemUtils>;
  const mockYaml = yaml as jest.Mocked<typeof yaml>;

  let testContent: string;
  let testConfig: Partial<OrderlyConfig>;

  beforeEach(() => {
    testContent = 'test: config';
    testConfig = { logLevel: 'info', dryRun: false };
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
      mockFileSystemUtils.readFile.mockReturnValue(jsonContent);

      const result = ConfigParser.parse(jsonPath);

      expect(result).toEqual(testConfig);
      expect(mockFileSystemUtils.readFile).toHaveBeenCalledWith(jsonPath);
    });

    it.each([
      ['.yml', 'YAML'],
      ['.yaml', 'YAML'],
      ['.YML', 'YAML'],
      ['.YAML', 'YAML']
    ])('should parse %s file as %s', ext => {
      const yamlPath = `/config/test${ext}`;
      mockFileSystemUtils.readFile.mockReturnValue(testContent);
      mockYaml.load.mockReturnValue(testConfig);

      const result = ConfigParser.parse(yamlPath);

      expect(result).toEqual(testConfig);
      expect(mockFileSystemUtils.readFile).toHaveBeenCalledWith(yamlPath);
      expect(mockYaml.load).toHaveBeenCalledWith(testContent);
    });

    it('should throw error for unsupported file format', () => {
      const unsupportedPath = '/config/test.txt';
      mockFileSystemUtils.readFile.mockReturnValue(testContent);

      expect(() => ConfigParser.parse(unsupportedPath)).toThrow(
        'Unsupported config file format: .txt'
      );
    });
  });

  describe('stringify', () => {
    it('should stringify config as JSON', () => {
      const config = testConfig as OrderlyConfig;
      const expected = JSON.stringify(config, null, 2);

      const result = ConfigParser.stringify(config, 'json');

      expect(result).toBe(expected);
    });

    it('should stringify config as YAML', () => {
      const config = testConfig as OrderlyConfig;
      const yamlOutput = 'test: config\n';
      mockYaml.dump.mockReturnValue(yamlOutput);

      const result = ConfigParser.stringify(config, 'yaml');

      expect(result).toBe(yamlOutput);
      expect(mockYaml.dump).toHaveBeenCalledWith(config);
    });

    it('should throw error for unsupported format', () => {
      const config = testConfig as OrderlyConfig;

      expect(() => ConfigParser.stringify(config, 'xml' as any)).toThrow('Unsupported format: xml');
    });
  });
});
