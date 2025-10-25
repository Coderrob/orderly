import { FileSystemUtils } from './file-system-utils';
import * as fs from 'node:fs';
import * as path from 'node:path';

jest.mock('node:fs');
jest.mock('node:path');

describe('FileSystemUtils', () => {
  let testPath: string;
  let testContent: string;
  let testDir: string;

  beforeEach(() => {
    testPath = '/test/path/file.txt';
    testContent = 'test content';
    testDir = '/test/dir';

    // Configure mocks
    jest.mocked(fs.existsSync).mockReturnValue(false);
    jest.mocked(fs.readFileSync).mockReturnValue('');
    jest.mocked(fs.writeFileSync).mockImplementation();
    jest.mocked(fs.appendFileSync).mockImplementation();
    jest.mocked(fs.mkdirSync).mockImplementation();
    jest.mocked(fs.renameSync).mockImplementation();
    jest.mocked(fs.statSync).mockReturnValue({} as fs.Stats);
    jest.mocked(path.dirname).mockReturnValue('/test/path');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exists', () => {
    it.each([
      [true, 'file exists'],
      [false, 'file does not exist']
    ])('should return %s when %s', expected => {
      jest.mocked(fs.existsSync).mockReturnValue(expected);

      const result = FileSystemUtils.existsSync(testPath);

      expect(result).toBe(expected);
      expect(fs.existsSync).toHaveBeenCalledWith(testPath);
    });
  });

  describe('readFile', () => {
    it('should read and return file content', () => {
      jest.mocked(fs.readFileSync).mockReturnValue(testContent);

      const result = FileSystemUtils.readFileSync(testPath);

      expect(result).toBe(testContent);
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
      expect(fs.readFileSync).toHaveBeenNthCalledWith(1, testPath, 'utf8');
    });
  });

  describe('writeFile', () => {
    it('should write content to file when directory exists', () => {
      jest.mocked(fs.existsSync).mockReturnValue(true);

      FileSystemUtils.writeFileSync(testPath, testContent);

      expect(path.dirname).toHaveBeenCalledTimes(1);
      expect(path.dirname).toHaveBeenNthCalledWith(1, testPath);
      expect(fs.existsSync).toHaveBeenCalledTimes(1);
      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, testPath, testContent, 'utf8');
    });

    it('should create directory and write file when directory does not exist', () => {
      const dirPath = '/test/path';
      jest.mocked(path.dirname).mockReturnValue(dirPath);
      jest.mocked(fs.existsSync).mockReturnValueOnce(false);

      FileSystemUtils.writeFileSync(testPath, testContent);

      expect(path.dirname).toHaveBeenCalledTimes(1);
      expect(path.dirname).toHaveBeenNthCalledWith(1, testPath);
      expect(fs.mkdirSync).toHaveBeenCalledTimes(1);
      expect(fs.mkdirSync).toHaveBeenNthCalledWith(1, dirPath, { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, testPath, testContent, 'utf8');
    });
  });

  describe('appendFile', () => {
    it('should append content to file', () => {
      FileSystemUtils.appendFileSync(testPath, testContent);

      expect(fs.appendFileSync).toHaveBeenCalledTimes(1);
      expect(fs.appendFileSync).toHaveBeenNthCalledWith(1, testPath, testContent, 'utf8');
    });
  });

  describe('mkdir', () => {
    it('should create directory when it does not exist', () => {
      jest.mocked(fs.existsSync).mockReturnValue(false);

      FileSystemUtils.mkdirSync(testDir);

      expect(fs.mkdirSync).toHaveBeenCalledTimes(1);
      expect(fs.mkdirSync).toHaveBeenNthCalledWith(1, testDir, { recursive: true });
    });

    it('should not create directory when it already exists', () => {
      jest.mocked(fs.existsSync).mockReturnValue(true);

      FileSystemUtils.mkdirSync(testDir);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(fs.existsSync).toHaveBeenCalledTimes(1);
      expect(fs.existsSync).toHaveBeenNthCalledWith(1, testDir);
    });
  });

  describe('rename', () => {
    it('should rename file from old path to new path', () => {
      const oldPath = '/old/path.txt';
      const newPath = '/new/path.txt';

      FileSystemUtils.renameSync(oldPath, newPath);

      expect(fs.renameSync).toHaveBeenCalledTimes(1);
      expect(fs.renameSync).toHaveBeenNthCalledWith(1, oldPath, newPath);
    });
  });

  describe('stat', () => {
    it('should return file stats', () => {
      const mockStats = { size: 1024, isFile: () => true } as fs.Stats;
      jest.mocked(fs.statSync).mockReturnValue(mockStats);

      const result = FileSystemUtils.statSync(testPath);

      expect(result).toBe(mockStats);
      expect(fs.statSync).toHaveBeenCalledTimes(1);
      expect(fs.statSync).toHaveBeenNthCalledWith(1, testPath);
    });
  });
});
