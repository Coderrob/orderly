import { FileScanner, ScannedFile } from './file-scanner';
import { OrderlyConfig } from '../config/types';
import { Logger } from '../logger/logger';
import { FileSystemUtils } from '../utils/file-system-utils';
import { FileCategorizer } from '../utils/file-categorizer';
import { glob } from 'glob';
import * as path from 'path';
import * as fs from 'fs';

jest.mock('../logger/logger');
jest.mock('../utils/file-system-utils');
jest.mock('../utils/file-categorizer');
jest.mock('glob');

describe('FileScanner', () => {
  const mockLogger = Logger as jest.Mocked<typeof Logger>;
  const mockFileSystemUtils = FileSystemUtils as jest.Mocked<typeof FileSystemUtils>;
  const mockFileCategorizer = FileCategorizer as jest.Mocked<typeof FileCategorizer>;
  const mockGlob = glob as jest.MockedFunction<typeof glob>;

  let scanner: FileScanner;
  let loggerInstance: jest.Mocked<Logger>;
  let testConfig: OrderlyConfig;
  let testDirectory: string;

  beforeEach(() => {
    loggerInstance = {
      info: jest.fn(),
      debug: jest.fn()
    } as any;
    testConfig = {
      categories: [{ name: 'images', extensions: ['.jpg'], targetFolder: 'images' }],
      namingConvention: { type: 'kebab-case', lowercase: true },
      excludePatterns: ['node_modules/**'],
      includeHidden: false,
      dryRun: false,
      generateManifest: true,
      logLevel: 'info'
    };
    testDirectory = '/test/dir';

    scanner = new FileScanner(testConfig, loggerInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scan', () => {
    it('should scan directory and return scanned files', async () => {
      mockGlob.mockResolvedValue(['file1.jpg', 'file2.txt']);
      mockFileSystemUtils.stat.mockReturnValue({
        isFile: () => true,
        size: 1024
      } as fs.Stats);
      mockFileCategorizer.categorize.mockReturnValue({
        name: 'images',
        extensions: ['.jpg'],
        targetFolder: 'images'
      });

      const result = await scanner.scan(testDirectory);

      expect(result).toHaveLength(2);
      expect(loggerInstance.info).toHaveBeenCalledWith(`Scanning directory: ${testDirectory}`);
      expect(loggerInstance.info).toHaveBeenCalledWith('Scanned 2 files');
    });

    it('should use correct glob pattern when hidden files excluded', async () => {
      mockGlob.mockResolvedValue([]);

      await scanner.scan(testDirectory);

      expect(mockGlob).toHaveBeenCalledWith(
        '**/[!.]*',
        expect.objectContaining({
          cwd: testDirectory,
          nodir: true,
          absolute: false
        })
      );
    });

    it('should use correct glob pattern when hidden files included', async () => {
      const configWithHidden = { ...testConfig, includeHidden: true };
      const scannerWithHidden = new FileScanner(configWithHidden, loggerInstance);
      mockGlob.mockResolvedValue([]);

      await scannerWithHidden.scan(testDirectory);

      expect(mockGlob).toHaveBeenCalledWith(
        '**/*',
        expect.objectContaining({ cwd: testDirectory })
      );
    });

    it('should exclude patterns from scan', async () => {
      mockGlob.mockResolvedValue([]);

      await scanner.scan(testDirectory);

      expect(mockGlob).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ignore: ['node_modules/**']
        })
      );
    });

    it('should skip non-file entries', async () => {
      mockGlob.mockResolvedValue(['file.txt', 'directory']);
      mockFileSystemUtils.stat
        .mockReturnValueOnce({ isFile: () => true, size: 100 } as fs.Stats)
        .mockReturnValueOnce({ isFile: () => false, size: 0 } as fs.Stats);
      mockFileCategorizer.categorize.mockReturnValue(undefined);

      const result = await scanner.scan(testDirectory);

      expect(result).toHaveLength(1);
    });

    it('should categorize files correctly', async () => {
      mockGlob.mockResolvedValue(['photo.jpg']);
      mockFileSystemUtils.stat.mockReturnValue({
        isFile: () => true,
        size: 2048
      } as fs.Stats);
      const category = {
        name: 'images',
        extensions: ['.jpg'],
        targetFolder: 'images'
      };
      mockFileCategorizer.categorize.mockReturnValue(category);

      const result = await scanner.scan(testDirectory);

      expect(mockFileCategorizer.categorize).toHaveBeenCalledWith(
        '.jpg',
        'photo.jpg',
        testConfig.categories
      );
      expect(result[0].category).toBe('images');
      expect(result[0].targetFolder).toBe('images');
    });

    it('should handle uncategorized files', async () => {
      mockGlob.mockResolvedValue(['unknown.xyz']);
      mockFileSystemUtils.stat.mockReturnValue({
        isFile: () => true,
        size: 512
      } as fs.Stats);
      mockFileCategorizer.categorize.mockReturnValue(undefined);

      const result = await scanner.scan(testDirectory);

      expect(result[0].category).toBeUndefined();
      expect(result[0].targetFolder).toBeUndefined();
    });

    it('should build complete ScannedFile object', async () => {
      mockGlob.mockResolvedValue(['test-file.txt']);
      mockFileSystemUtils.stat.mockReturnValue({
        isFile: () => true,
        size: 256
      } as fs.Stats);
      mockFileCategorizer.categorize.mockReturnValue(undefined);

      const result = await scanner.scan(testDirectory);

      expect(result[0]).toEqual({
        originalPath: expect.stringContaining('test-file.txt'),
        filename: 'test-file.txt',
        extension: '.txt',
        size: 256,
        category: undefined,
        targetFolder: undefined,
        needsRename: false
      });
    });

    it('should log debug information', async () => {
      mockGlob.mockResolvedValue(['file1.txt', 'file2.txt']);
      mockFileSystemUtils.stat.mockReturnValue({
        isFile: () => true,
        size: 100
      } as fs.Stats);
      mockFileCategorizer.categorize.mockReturnValue(undefined);

      await scanner.scan(testDirectory);

      expect(loggerInstance.debug).toHaveBeenCalledWith('Found 2 files');
    });
  });

  describe('getCategorySummary', () => {
    it('should return summary of categorized files', () => {
      const files: ScannedFile[] = [
        {
          originalPath: '/test/file1.jpg',
          filename: 'file1.jpg',
          extension: '.jpg',
          size: 100,
          category: 'images',
          targetFolder: 'images',
          needsRename: false
        },
        {
          originalPath: '/test/file2.jpg',
          filename: 'file2.jpg',
          extension: '.jpg',
          size: 200,
          category: 'images',
          targetFolder: 'images',
          needsRename: false
        },
        {
          originalPath: '/test/file3.txt',
          filename: 'file3.txt',
          extension: '.txt',
          size: 150,
          category: 'documents',
          targetFolder: 'documents',
          needsRename: false
        }
      ];

      const summary = scanner.getCategorySummary(files);

      expect(summary.get('images')).toBe(2);
      expect(summary.get('documents')).toBe(1);
    });

    it('should count uncategorized files', () => {
      const files: ScannedFile[] = [
        {
          originalPath: '/test/file.xyz',
          filename: 'file.xyz',
          extension: '.xyz',
          size: 100,
          needsRename: false
        }
      ];

      const summary = scanner.getCategorySummary(files);

      expect(summary.get('uncategorized')).toBe(1);
    });

    it('should return empty map for no files', () => {
      const summary = scanner.getCategorySummary([]);

      expect(summary.size).toBe(0);
    });

    it('should handle mixed categorized and uncategorized files', () => {
      const files: ScannedFile[] = [
        {
          originalPath: '/test/file1.jpg',
          filename: 'file1.jpg',
          extension: '.jpg',
          size: 100,
          category: 'images',
          targetFolder: 'images',
          needsRename: false
        },
        {
          originalPath: '/test/file2.xyz',
          filename: 'file2.xyz',
          extension: '.xyz',
          size: 100,
          needsRename: false
        }
      ];

      const summary = scanner.getCategorySummary(files);

      expect(summary.get('images')).toBe(1);
      expect(summary.get('uncategorized')).toBe(1);
    });
  });
});
