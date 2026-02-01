import { Sha256Strategy } from '../strategies/sha256-strategy';
import { IDedupeHasher } from '../interfaces';
import { IScannedFile } from '../../scanner/interfaces';

describe('Sha256Strategy', () => {
  let strategy: Sha256Strategy;
  let mockHasher: jest.Mocked<IDedupeHasher>;
  let mockFile: IScannedFile;

  beforeEach(() => {
    mockHasher = {
      sha256: jest.fn()
    } as jest.Mocked<IDedupeHasher>;

    mockFile = {
      filename: 'test-file.txt',
      extension: '.txt',
      originalPath: '/path/to/test-file.txt',
      relativePath: 'test-file.txt',
      size: 1024,
      category: 'documents',
      needsRename: false
    } as IScannedFile;

    strategy = new Sha256Strategy(mockHasher);
  });

  describe('constructor', () => {
    it('should create strategy with correct properties', () => {
      expect(strategy.name).toBe('sha256');
      expect(strategy.priority).toBe(100);
    });

    it('should store hasher reference', () => {
      expect((strategy as any).hasher).toBe(mockHasher);
    });
  });

  describe('supports', () => {
    it('should support all files', () => {
      expect(strategy.supports(mockFile)).toBe(true);
    });
  });

  describe('getKey', () => {
    it('should call hasher with file path', async () => {
      mockHasher.sha256.mockResolvedValue('mock-hash');

      await strategy.getKey(mockFile);

      expect(mockHasher.sha256).toHaveBeenCalledWith(mockFile.originalPath);
      expect(mockHasher.sha256).toHaveBeenCalledTimes(1);
    });

    it('should return hash from hasher', async () => {
      const expectedHash = 'abc123def456';
      mockHasher.sha256.mockResolvedValue(expectedHash);

      const result = await strategy.getKey(mockFile);

      expect(result).toBe(expectedHash);
    });

    it('should return null on hasher error', async () => {
      mockHasher.sha256.mockRejectedValue(new Error('Hash failed'));

      const result = await strategy.getKey(mockFile);

      expect(result).toBeNull();
    });

    it('should handle different hash values', async () => {
      const hashes = [
        'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
      ];

      for (const hash of hashes) {
        mockHasher.sha256.mockResolvedValue(hash);
        const result = await strategy.getKey(mockFile);
        expect(result).toBe(hash);
      }
    });

    it('should call hasher for each file', async () => {
      const files = [
        { ...mockFile, originalPath: '/path/file1.txt' },
        { ...mockFile, originalPath: '/path/file2.txt' },
        { ...mockFile, originalPath: '/path/file3.txt' }
      ];

      mockHasher.sha256.mockResolvedValue('hash');

      for (const file of files) {
        await strategy.getKey(file);
      }

      expect(mockHasher.sha256).toHaveBeenCalledTimes(3);
      expect(mockHasher.sha256).toHaveBeenNthCalledWith(1, '/path/file1.txt');
      expect(mockHasher.sha256).toHaveBeenNthCalledWith(2, '/path/file2.txt');
      expect(mockHasher.sha256).toHaveBeenNthCalledWith(3, '/path/file3.txt');
    });
  });
});
