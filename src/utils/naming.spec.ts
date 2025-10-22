import { NamingUtils } from './naming';
import { NamingConvention } from '../config/types';

describe('NamingUtils', () => {
  let testString: string;
  let testConvention: NamingConvention;

  beforeEach(() => {
    testString = 'Test File Name';
    testConvention = { type: 'kebab-case', lowercase: true };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('toKebabCase', () => {
    it.each([
      ['TestFileName', 'test-file-name'],
      ['test file name', 'test-file-name'],
      ['test_file_name', 'test-file-name'],
      ['TEST-FILE-NAME', 'test-file-name'],
      ['test123file', 'test123file']
    ])('should convert "%s" to "%s"', (input, expected) => {
      const result = NamingUtils.toKebabCase(input);

      expect(result).toBe(expected);
    });

    it('should remove special characters', () => {
      const result = NamingUtils.toKebabCase('test@file#name');

      expect(result).toBe('testfilename');
    });
  });

  describe('toSnakeCase', () => {
    it.each([
      ['TestFileName', 'test_file_name'],
      ['test file name', 'test_file_name'],
      ['test-file-name', 'test_file_name'],
      ['TEST_FILE_NAME', 'test_file_name']
    ])('should convert "%s" to "%s"', (input, expected) => {
      const result = NamingUtils.toSnakeCase(input);

      expect(result).toBe(expected);
    });

    it('should remove special characters', () => {
      const result = NamingUtils.toSnakeCase('test@file#name');

      expect(result).toBe('testfilename');
    });
  });

  describe('toCamelCase', () => {
    it.each([
      ['test-file-name', 'testFileName'],
      ['test_file_name', 'testFileName'],
      ['test file name', 'testFileName'],
      ['TestFileName', 'testfilename']
    ])('should convert "%s" to "%s"', (input, expected) => {
      const result = NamingUtils.toCamelCase(input);

      expect(result).toBe(expected);
    });
  });

  describe('toPascalCase', () => {
    it.each([
      ['test-file-name', 'TestFileName'],
      ['test_file_name', 'TestFileName'],
      ['test file name', 'TestFileName'],
      ['testFileName', 'Testfilename']
    ])('should convert "%s" to "%s"', (input, expected) => {
      const result = NamingUtils.toPascalCase(input);

      expect(result).toBe(expected);
    });
  });

  describe('applyNamingConvention', () => {
    it.each([
      ['kebab-case', 'Test File.txt', 'test-file.txt'],
      ['snake_case', 'Test File.txt', 'test_file.txt'],
      ['camelCase', 'Test File.txt', 'testFile.txt'],
      ['PascalCase', 'Test File.txt', 'TestFile.txt']
    ])('should apply %s convention to filename', (type, filename, expected) => {
      const convention: NamingConvention = { type: type as any, lowercase: true };

      const result = NamingUtils.applyNamingConvention(filename, convention);

      expect(result).toBe(expected);
    });

    it('should preserve file extension', () => {
      const result = NamingUtils.applyNamingConvention('Test File.TXT', testConvention);

      expect(result).toBe('test-file.txt');
    });

    it('should handle files without extension', () => {
      const result = NamingUtils.applyNamingConvention('TestFile', testConvention);

      expect(result).toBe('testfile');
    });

    it('should not lowercase camelCase convention', () => {
      const convention: NamingConvention = { type: 'camelCase', lowercase: true };
      const result = NamingUtils.applyNamingConvention('Test File.txt', convention);

      expect(result).toBe('testFile.txt');
    });

    it('should not lowercase PascalCase convention', () => {
      const convention: NamingConvention = { type: 'PascalCase', lowercase: true };
      const result = NamingUtils.applyNamingConvention('test file.txt', convention);

      expect(result).toBe('TestFile.txt');
    });
  });

  describe('needsRename', () => {
    it.each([
      ['test-file.txt', 'kebab-case', false],
      ['Test File.txt', 'kebab-case', true],
      ['test_file.txt', 'snake_case', false],
      ['Test File.txt', 'snake_case', true],
      ['testFile.txt', 'camelCase', false],
      ['Test File.txt', 'camelCase', true]
    ])('should return correct result for "%s" with %s convention', (filename, type, expected) => {
      const convention: NamingConvention = { type: type as any, lowercase: true };

      const result = NamingUtils.needsRename(filename, convention);

      expect(result).toBe(expected);
    });
  });
});
