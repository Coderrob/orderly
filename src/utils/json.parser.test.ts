import { formatJson, parseJsonFile, writeJsonFile, safeJsonParse } from './json.parser';
import { Logger } from '../logger/logger';
import { FileSystemUtils } from './file-system-utils';

// Mock FileSystemUtils
jest.mock('./file-system-utils', () => ({
  FileSystemUtils: {
    readFileSync: jest.fn(),
    writeFileSync: jest.fn()
  }
}));

// Mock Logger
jest.mock('../logger/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }))
}));

describe('JSON Parser', () => {
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = new Logger() as jest.Mocked<Logger>;
    jest.clearAllMocks();
  });

  describe('formatJson', () => {
    it('should format object as JSON string with default indentation', () => {
      const obj = { key: 'value', number: 42 };
      const result = formatJson(obj);
      expect(result).toBe('{"key":"value","number":42}');
    });

    it('should format object as JSON string with custom indentation', () => {
      const obj = { key: 'value' };
      const result = formatJson(obj, 2);
      expect(result).toBe('{\n  "key": "value"\n}');
    });
  });

  describe('parseJsonFile', () => {
    it('should parse valid JSON file successfully', () => {
      const mockData = { key: 'value', number: 42 };
      const jsonString = JSON.stringify(mockData);
      (FileSystemUtils.readFileSync as jest.Mock).mockReturnValue(jsonString);

      const result = parseJsonFile('/path/to/file.json', mockLogger);

      expect(result).toEqual(mockData);
      expect(FileSystemUtils.readFileSync).toHaveBeenCalledWith('/path/to/file.json');
      expect(mockLogger.debug).toHaveBeenCalledWith('Parsed JSON file', {
        filePath: '/path/to/file.json'
      });
    });

    it('should return null when JSON parsing fails', () => {
      (FileSystemUtils.readFileSync as jest.Mock).mockReturnValue('invalid json');

      const result = parseJsonFile('/path/to/file.json', mockLogger);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to parse JSON file', {
        error: expect.any(String),
        filePath: '/path/to/file.json'
      });
    });

    it('should return null when file read fails', () => {
      (FileSystemUtils.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = parseJsonFile('/path/to/file.json', mockLogger);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('writeJsonFile', () => {
    it('should write data to JSON file successfully', () => {
      const data = { key: 'value' };

      const result = writeJsonFile('/path/to/file.json', data, mockLogger);

      expect(result).toEqual({ success: true });
      expect(FileSystemUtils.writeFileSync).toHaveBeenCalledWith(
        '/path/to/file.json',
        '{"key":"value"}'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Wrote JSON file', {
        filePath: '/path/to/file.json'
      });
    });

    it('should return false when write fails', () => {
      (FileSystemUtils.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write failed');
      });

      const result = writeJsonFile('/path/to/file.json', { key: 'value' }, mockLogger);

      expect(result).toEqual({
        error: 'Error: Write failed',
        success: false
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to write JSON file', {
        error: 'Error: Write failed',
        filePath: '/path/to/file.json'
      });
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON string successfully', () => {
      const jsonString = '{"key":"value","number":42}';
      const expected = { key: 'value', number: 42 };

      const result = safeJsonParse(jsonString, mockLogger);

      expect(result).toEqual(expected);
    });

    it('should return null when JSON parsing fails', () => {
      const jsonString = 'invalid json';

      const result = safeJsonParse(jsonString, mockLogger);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to parse JSON string', {
        error: expect.any(String)
      });
    });
  });
});
