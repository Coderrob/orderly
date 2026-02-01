import { NamingUtils } from './naming';
import { NamingConvention, NamingConventionType } from '../config/types';

describe('NamingUtils', () => {
  let testConvention: NamingConvention;
  let namingUtils: NamingUtils;

  beforeEach(() => {
    testConvention = { type: NamingConventionType.KEBAB_CASE, lowercase: true };
    namingUtils = new NamingUtils();
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

    it('should handle empty string', () => {
      const result = NamingUtils.toKebabCase('');

      expect(result).toBe('');
    });

    it('should handle string with only special characters', () => {
      const result = NamingUtils.toKebabCase('@#$%^&*()');

      expect(result).toBe('');
    });

    it('should handle unicode characters', () => {
      const result = NamingUtils.toKebabCase('tëst fílé');

      expect(result).toBe('tst-fl');
    });
    it('should handle multiple consecutive separators', () => {
      const result = NamingUtils.toKebabCase('test__file  name');

      expect(result).toBe('test-file-name');
    });
  });

  describe('toSnakeCase', () => {
    it.each([
      ['TestFileName', 'test_file_name'],
      ['test file name', 'test_file_name'],
      ['test-file-name', 'test_file_name'],
      ['TEST_FILE_NAME', 'test_file_name'],
      ['test-', 'test_']
    ])('should convert "%s" to "%s"', (input, expected) => {
      const result = NamingUtils.toSnakeCase(input);

      expect(result).toBe(expected);
    });

    it('should remove special characters', () => {
      const result = NamingUtils.toSnakeCase('test@file#name');

      expect(result).toBe('testfilename');
    });

    it('should handle empty string', () => {
      const result = NamingUtils.toSnakeCase('');

      expect(result).toBe('');
    });

    it('should handle string with only special characters', () => {
      const result = NamingUtils.toSnakeCase('@#$%^&*()');

      expect(result).toBe('');
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

    it('should handle trailing separators', () => {
      const result = NamingUtils.toCamelCase('test-file-');

      expect(result).toBe('testFile');
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

    it('should handle trailing separators', () => {
      const result = NamingUtils.toPascalCase('test-file-');

      expect(result).toBe('TestFile');
    });
  });

  describe('applyNamingConvention', () => {
    it.each([
      [NamingConventionType.KEBAB_CASE, 'Test File.txt', 'test-file.txt'],
      [NamingConventionType.SNAKE_CASE, 'Test File.txt', 'test_file.txt'],
      [NamingConventionType.CAMEL_CASE, 'Test File.txt', 'testFile.txt'],
      [NamingConventionType.PASCAL_CASE, 'Test File.txt', 'TestFile.txt']
    ])('should apply %s convention to filename', (type, filename, expected) => {
      const convention: NamingConvention = { type, lowercase: true };

      const result = NamingUtils.applyNamingConvention(filename, convention);

      expect(result).toBe(expected);
    });

    it('should preserve file extension', () => {
      const result = NamingUtils.applyNamingConvention('Test File.TXT', testConvention);

      expect(result).toBe('test-file.txt');
    });

    it('should handle files without extension', () => {
      const convention: NamingConvention = {
        type: NamingConventionType.CAMEL_CASE,
        lowercase: true
      };
      const result = NamingUtils.applyNamingConvention('TestFile', convention);

      expect(result).toBe('testfile');
    });

    it('should not lowercase camelCase convention', () => {
      const convention: NamingConvention = {
        type: NamingConventionType.CAMEL_CASE,
        lowercase: true
      };
      const result = NamingUtils.applyNamingConvention('Test File.txt', convention);

      expect(result).toBe('testFile.txt');
    });

    it('should not lowercase PascalCase convention', () => {
      const convention: NamingConvention = {
        type: NamingConventionType.PASCAL_CASE,
        lowercase: true
      };
      const result = NamingUtils.applyNamingConvention('test file.txt', convention);

      expect(result).toBe('TestFile.txt');
    });

    it('should handle unknown convention type', () => {
      const convention: NamingConvention = {
        type: 'unknown' as any,
        lowercase: true
      };
      const result = NamingUtils.applyNamingConvention('Test File.txt', convention);

      expect(result).toBe('test file.txt');
    });

    it('should not apply lowercase when convention.lowercase is false', () => {
      const convention: NamingConvention = {
        type: NamingConventionType.KEBAB_CASE,
        lowercase: false
      };
      const result = NamingUtils.applyNamingConvention('Test File.txt', convention);

      expect(result).toBe('test-file.txt');
    });
  });

  describe('needsRename', () => {
    it.each([
      ['test-file.txt', NamingConventionType.KEBAB_CASE, false],
      ['Test File.txt', NamingConventionType.KEBAB_CASE, true],
      ['test_file.txt', NamingConventionType.SNAKE_CASE, false],
      ['Test File.txt', NamingConventionType.SNAKE_CASE, true],
      ['testFile.txt', NamingConventionType.CAMEL_CASE, true], // Will be converted to testfile.txt due to lowercase
      ['Test File.txt', NamingConventionType.CAMEL_CASE, true]
    ])('should return correct result for "%s" with %s convention', (filename, type, expected) => {
      const convention: NamingConvention = { type, lowercase: true };

      const result = NamingUtils.needsRename(filename, convention);

      expect(result).toBe(expected);
    });

    it('should return false for empty filename', () => {
      const result = NamingUtils.needsRename('', testConvention);
      expect(result).toBe(false);
    });

    it('should return false for filename without extension', () => {
      const result = NamingUtils.needsRename('testfile', testConvention);
      expect(result).toBe(false);
    });

    it('should return true for filename with only extension starting with dot', () => {
      const result = NamingUtils.needsRename('.txt', testConvention);
      expect(result).toBe(true);
    });

    it('should handle filename with multiple dots', () => {
      const result = NamingUtils.needsRename('test.file.name.txt', testConvention);
      expect(result).toBe(true);
    });
  });

  describe('instance methods', () => {
    describe('toKebabCase', () => {
      it('should delegate to static method', () => {
        const result = namingUtils.toKebabCase('TestFileName');
        expect(result).toBe('test-file-name');
      });
    });

    describe('toSnakeCase', () => {
      it('should delegate to static method', () => {
        const result = namingUtils.toSnakeCase('TestFileName');
        expect(result).toBe('test_file_name');
      });
    });

    describe('toCamelCase', () => {
      it('should delegate to static method', () => {
        const result = namingUtils.toCamelCase('test-file-name');
        expect(result).toBe('testFileName');
      });
    });

    describe('toPascalCase', () => {
      it('should delegate to static method', () => {
        const result = namingUtils.toPascalCase('test-file-name');
        expect(result).toBe('TestFileName');
      });
    });

    describe('applyNamingConvention', () => {
      it('should delegate to static method', () => {
        const result = namingUtils.applyNamingConvention('Test File.txt', testConvention);
        expect(result).toBe('test-file.txt');
      });
    });

    describe('needsRename', () => {
      it('should delegate to static method', () => {
        const result = namingUtils.needsRename('Test File.txt', testConvention);
        expect(result).toBe(true);
      });
    });
  });
});
