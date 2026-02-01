import * as fs from 'node:fs';
import * as path from 'node:path';

import { DirectoryValidator } from './directory-validator.service';

jest.mock('node:fs');
jest.mock('node:path');

describe('DirectoryValidator', () => {
  let validator: DirectoryValidator;
  let mockFs: jest.Mocked<typeof fs>;
  let mockPath: jest.Mocked<typeof path>;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new DirectoryValidator();
    mockFs = fs as jest.Mocked<typeof fs>;
    mockPath = path as jest.Mocked<typeof path>;

    // Default mocks
    mockPath.resolve.mockImplementation(p => p);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({
      isDirectory: () => true
    } as any);
    mockFs.readdirSync.mockReturnValue([]);
  });

  describe('validate', () => {
    it('should return resolved path when directory exists and is accessible', () => {
      const directory = 'test/dir';
      const resolvedPath = '/absolute/test/dir';

      mockPath.resolve.mockReturnValue(resolvedPath);

      const result = validator.validate(directory);

      expect(mockPath.resolve).toHaveBeenCalledWith(directory);
      expect(mockFs.existsSync).toHaveBeenCalledWith(resolvedPath);
      expect(mockFs.statSync).toHaveBeenCalledWith(resolvedPath);
      expect(mockFs.readdirSync).toHaveBeenCalledWith(resolvedPath);
      expect(result).toBe(resolvedPath);
    });

    it('should throw error when directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => {
        validator.validate('nonexistent');
      }).toThrow('Directory does not exist: nonexistent');
    });

    it('should handle absolute paths correctly', () => {
      const absolutePath = '/absolute/path';
      mockPath.resolve.mockReturnValue(absolutePath);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      mockFs.readdirSync.mockReturnValue([]);

      const result = validator.validate(absolutePath);

      expect(result).toBe(absolutePath);
      expect(mockPath.resolve).toHaveBeenCalledWith(absolutePath);
    });

    it('should throw error when path is not a directory', () => {
      mockFs.statSync.mockReturnValue({
        isDirectory: () => false
      } as any);

      expect(() => {
        validator.validate('file.txt');
      }).toThrow('Path is not a directory: file.txt');
    });

    it('should throw error when directory is not accessible', () => {
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => {
        validator.validate('inaccessible');
      }).toThrow('Directory is not accessible: inaccessible');
    });

    it('should resolve relative paths', () => {
      const relativePath = './relative/path';
      const absolutePath = '/absolute/relative/path';

      mockPath.resolve.mockReturnValue(absolutePath);

      const result = validator.validate(relativePath);

      expect(mockPath.resolve).toHaveBeenCalledWith(relativePath);
      expect(result).toBe(absolutePath);
    });
  });
});
