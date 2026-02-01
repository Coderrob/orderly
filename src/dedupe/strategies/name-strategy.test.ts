import { NameStrategy } from '../strategies/name-strategy';
import { IScannedFile } from '../../scanner/interfaces';

describe('NameStrategy', () => {
  let strategy: NameStrategy;
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
  });

  describe('constructor', () => {
    it('should create strategy with default config', () => {
      strategy = new NameStrategy();

      expect(strategy.name).toBe('name');
      expect(strategy.priority).toBe(10);
    });

    it('should create strategy with custom config', () => {
      const config = { caseSensitive: true, ignoreExtension: true };
      strategy = new NameStrategy(config);

      expect(strategy.name).toBe('name');
      expect(strategy.priority).toBe(10);
    });
  });

  describe('supports', () => {
    it('should support all files', () => {
      strategy = new NameStrategy();

      expect(strategy.supports(mockFile)).toBe(true);
    });
  });

  describe('getKey', () => {
    describe('with default config (case insensitive, include extension)', () => {
      beforeEach(() => {
        strategy = new NameStrategy();
      });

      it('should return filename as key', async () => {
        const result = await strategy.getKey(mockFile);
        expect(result).toBe('test-file.txt');
      });

      it('should convert to lowercase', async () => {
        mockFile.filename = 'Test-File.TXT';
        const result = await strategy.getKey(mockFile);
        expect(result).toBe('test-file.txt');
      });

      it('should handle files without extension', async () => {
        mockFile.filename = 'README';
        mockFile.extension = '';
        const result = await strategy.getKey(mockFile);
        expect(result).toBe('readme');
      });
    });

    describe('with case sensitive config', () => {
      beforeEach(() => {
        strategy = new NameStrategy({ caseSensitive: true, ignoreExtension: false });
      });

      it('should preserve case', async () => {
        mockFile.filename = 'Test-File.TXT';
        const result = await strategy.getKey(mockFile);
        expect(result).toBe('Test-File.TXT');
      });
    });

    describe('with ignore extension config', () => {
      beforeEach(() => {
        strategy = new NameStrategy({ caseSensitive: false, ignoreExtension: true });
      });

      it('should remove extension from key', async () => {
        const result = await strategy.getKey(mockFile);
        expect(result).toBe('test-file');
      });

      it('should handle files without extension', async () => {
        mockFile.filename = 'README';
        mockFile.extension = '';
        const result = await strategy.getKey(mockFile);
        expect(result).toBe('readme');
      });

      it('should handle multiple dots in filename', async () => {
        mockFile.filename = 'test.file.name.txt';
        const result = await strategy.getKey(mockFile);
        expect(result).toBe('test.file.name');
      });
    });

    describe('with both case sensitive and ignore extension', () => {
      beforeEach(() => {
        strategy = new NameStrategy({ caseSensitive: true, ignoreExtension: true });
      });

      it('should preserve case and remove extension', async () => {
        mockFile.filename = 'Test-File.TXT';
        const result = await strategy.getKey(mockFile);
        expect(result).toBe('Test-File');
      });
    });
  });
});
