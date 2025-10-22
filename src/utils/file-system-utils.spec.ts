import { FileSystemUtils } from './file-system-utils';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('FileSystemUtils', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  let testPath: string;
  let testContent: string;
  let testDir: string;

  beforeEach(() => {
    testPath = '/test/path/file.txt';
    testContent = 'test content';
    testDir = '/test/dir';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exists', () => {
    it.each([
      [true, 'file exists'],
      [false, 'file does not exist']
    ])('should return %s when %s', expected => {
      mockFs.existsSync.mockReturnValue(expected);

      const result = FileSystemUtils.exists(testPath);

      expect(result).toBe(expected);
      expect(mockFs.existsSync).toHaveBeenCalledWith(testPath);
    });
  });

  describe('readFile', () => {
    it('should read and return file content', () => {
      mockFs.readFileSync.mockReturnValue(testContent);

      const result = FileSystemUtils.readFile(testPath);

      expect(result).toBe(testContent);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(testPath, 'utf8');
    });
  });

  describe('writeFile', () => {
    it('should write content to file when directory exists', () => {
      mockFs.existsSync.mockReturnValue(true);

      FileSystemUtils.writeFile(testPath, testContent);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(testPath, testContent, 'utf8');
    });

    it('should create directory and write file when directory does not exist', () => {
      mockFs.existsSync.mockReturnValueOnce(false);
      const dirPath = '/test/path';
      jest.spyOn(path, 'dirname').mockReturnValue(dirPath);

      FileSystemUtils.writeFile(testPath, testContent);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(dirPath, { recursive: true });
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(testPath, testContent, 'utf8');
    });
  });

  describe('appendFile', () => {
    it('should append content to file', () => {
      FileSystemUtils.appendFile(testPath, testContent);

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(testPath, testContent, 'utf8');
    });
  });

  describe('mkdir', () => {
    it('should create directory when it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      FileSystemUtils.mkdir(testDir);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(testDir, { recursive: true });
    });

    it('should not create directory when it already exists', () => {
      mockFs.existsSync.mockReturnValue(true);

      FileSystemUtils.mkdir(testDir);

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('rename', () => {
    it('should rename file from old path to new path', () => {
      const oldPath = '/old/path.txt';
      const newPath = '/new/path.txt';

      FileSystemUtils.rename(oldPath, newPath);

      expect(mockFs.renameSync).toHaveBeenCalledWith(oldPath, newPath);
    });
  });

  describe('stat', () => {
    it('should return file stats', () => {
      const mockStats = { size: 1024, isFile: () => true } as fs.Stats;
      mockFs.statSync.mockReturnValue(mockStats);

      const result = FileSystemUtils.stat(testPath);

      expect(result).toBe(mockStats);
      expect(mockFs.statSync).toHaveBeenCalledWith(testPath);
    });
  });
});
