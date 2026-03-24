import { SizeStrategy } from '../strategies/size-strategy';
import { IScannedFile } from '../../scanner/interfaces';

describe('SizeStrategy', () => {
  let strategy: SizeStrategy;
  let mockFile: IScannedFile;

  beforeEach(() => {
    mockFile = {
      filename: 'test-file.txt',
      extension: '.txt',
      originalPath: '/path/to/test-file.txt',
      relativePath: 'test-file.txt',
      size: 1024,
      category: 'documents',
      needsRename: false
    } as IScannedFile;

    strategy = new SizeStrategy();
  });

  describe('constructor', () => {
    it('should create strategy with correct properties', () => {
      expect(strategy.name).toBe('size');
      expect(strategy.priority).toBe(5);
    });
  });

  describe('supports', () => {
    it('should support all files', () => {
      expect(strategy.canProcess(mockFile)).toBe(true);
    });
  });

  describe('getKey', () => {
    it('should return file size as string key', async () => {
      const result = await strategy.getKey(mockFile);
      expect(result).toBe('1024');
    });

    it('should handle zero size files', async () => {
      mockFile.size = 0;
      const result = await strategy.getKey(mockFile);
      expect(result).toBe('0');
    });

    it('should handle large files', async () => {
      mockFile.size = 1073741824; // 1GB
      const result = await strategy.getKey(mockFile);
      expect(result).toBe('1073741824');
    });

    it('should handle different file sizes', async () => {
      const sizes = [1, 100, 1000, 10000, 100000];

      for (const size of sizes) {
        mockFile.size = size;
        const result = await strategy.getKey(mockFile);
        expect(result).toBe(String(size));
      }
    });
  });
});
