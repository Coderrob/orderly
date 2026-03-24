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
    mockFs.accessSync.mockImplementation(() => undefined);
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
      expect(mockFs.accessSync).toHaveBeenCalledWith(resolvedPath, fs.constants.R_OK);
      expect(result).toBe(resolvedPath);
    });

    it('should throw error when directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => {
        validator.validate('nonexistent');
      }).toThrow('Directory does not exist: nonexistent');
      expect(mockFs.statSync).not.toHaveBeenCalled();
      expect(mockFs.accessSync).not.toHaveBeenCalled();
    });

    it('should handle absolute paths correctly', () => {
      const absolutePath = '/absolute/path';
      mockPath.resolve.mockReturnValue(absolutePath);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      mockFs.accessSync.mockImplementation(() => undefined);

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
      expect(mockFs.accessSync).not.toHaveBeenCalled();
    });

    it('should throw error when directory is not accessible', () => {
      mockFs.accessSync.mockImplementation(() => {
        throw new Error('EACCES');
      });

      expect(() => {
        validator.validate('inaccessible');
      }).toThrow('EACCES');
    });

    it('should rethrow stat errors', () => {
      mockFs.statSync.mockImplementation(() => {
        throw new Error('Stat failed');
      });

      expect(() => {
        validator.validate('stat-fails');
      }).toThrow('Stat failed');
      expect(mockFs.accessSync).not.toHaveBeenCalled();
    });

    it('should rethrow resolve errors', () => {
      mockPath.resolve.mockImplementation(() => {
        throw new Error('Resolve failed');
      });

      expect(() => {
        validator.validate('bad-path');
      }).toThrow('Resolve failed');
      expect(mockFs.existsSync).not.toHaveBeenCalled();
      expect(mockFs.statSync).not.toHaveBeenCalled();
      expect(mockFs.accessSync).not.toHaveBeenCalled();
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
