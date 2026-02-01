import { promises as fs } from 'node:fs';
import { MetadataExtractor } from './metadata-extractor';

/**
 * Unit tests for MetadataExtractor.
 */
describe('MetadataExtractor', () => {
  let extractor: MetadataExtractor;

  beforeEach(() => {
    extractor = new MetadataExtractor();
  });

  describe('IMetadataExtractor contract', () => {
    it('should implement IMetadataExtractor interface', () => {
      expect(extractor).toBeDefined();
      expect(typeof extractor.extractDimensions).toBe('function');
      expect(typeof extractor.extractExif).toBe('function');
      expect(typeof extractor.extractProperties).toBe('function');
      expect(typeof extractor.extractAttributes).toBe('function');
    });
  });

  describe('extractDimensions', () => {
    it('should return null (placeholder implementation)', async () => {
      const result = await extractor.extractDimensions('/path/image.jpg');
      expect(result).toBeNull();
    });
  });

  describe('extractExif', () => {
    it('should return null (placeholder implementation)', async () => {
      const result = await extractor.extractExif('/path/image.jpg');
      expect(result).toBeNull();
    });
  });

  describe('extractProperties', () => {
    it('should return null when file does not exist', async () => {
      const result = await extractor.extractProperties('/nonexistent/file.txt');
      expect(result).toBeNull();
    });

    it('should extract properties from existing file', async () => {
      // Create a temporary test file
      const testFilePath = './test-temp-file.txt';
      const testContent = 'test content';

      try {
        await fs.writeFile(testFilePath, testContent, 'utf8');

        const result = await extractor.extractProperties(testFilePath);

        expect(result).not.toBeNull();
        expect(result).toBeDefined();
        if (result) {
          expect(typeof result.createdAt).toBe('object');
          expect(result.createdAt).toBeTruthy();
          expect(typeof result.modifiedAt).toBe('object');
          expect(result.modifiedAt).toBeTruthy();
          expect(result.mimeType).toBe('text/plain');
        }
      } finally {
        // Clean up
        try {
          await fs.unlink(testFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it('should extract properties from image file', async () => {
      // Create a temporary test file with .jpg extension
      const testFilePath = './test-temp-file.jpg';
      const testContent = 'fake image content';

      try {
        await fs.writeFile(testFilePath, testContent, 'utf8');

        const result = await extractor.extractProperties(testFilePath);

        expect(result).not.toBeNull();
        expect(result).toBeDefined();
        if (result) {
          expect(typeof result.createdAt).toBe('object');
          expect(result.createdAt).toBeTruthy();
          expect(typeof result.modifiedAt).toBe('object');
          expect(result.modifiedAt).toBeTruthy();
          expect(result.mimeType).toBe('image/jpeg');
        }
      } finally {
        // Clean up
        try {
          await fs.unlink(testFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('extractAttributes', () => {
    it('should return null when file does not exist', async () => {
      const result = await extractor.extractAttributes('/nonexistent/file.txt');
      expect(result).toBeNull();
    });

    it('should extract attributes from existing file', async () => {
      // Create a temporary test file
      const testFilePath = './test-temp-file-attributes.txt';
      const testContent = 'test content';

      try {
        await fs.writeFile(testFilePath, testContent, 'utf8');

        const result = await extractor.extractAttributes(testFilePath);

        expect(result).not.toBeNull();
        expect(typeof result?.hidden).toBe('boolean');
        expect(typeof result?.readonly).toBe('boolean');
        expect(typeof result?.system).toBe('boolean');
      } finally {
        // Clean up
        try {
          await fs.unlink(testFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('private methods', () => {
    describe('isHiddenFile', () => {
      it('should detect dot-files as hidden', () => {
        expect(extractor['isHiddenFile']('/path/.hidden')).toBe(true);
        expect(extractor['isHiddenFile']('/path/normal.txt')).toBe(false);
      });
    });

    describe('isSystemFile', () => {
      it('should return false for regular files', () => {
        const mockStats = { mode: 0o644 } as any;
        expect(extractor['isSystemFile']('/path/file.txt', mockStats)).toBe(false);
      });

      it('should return true for system files on Unix-like systems', () => {
        const mockStats = { mode: 0o644 } as any;
        expect(extractor['isSystemFile']('/sys/file', mockStats, 'linux')).toBe(true);
        expect(extractor['isSystemFile']('/proc/file', mockStats, 'linux')).toBe(true);
        expect(extractor['isSystemFile']('/dev/file', mockStats, 'linux')).toBe(true);
        expect(extractor['isSystemFile']('/home/file', mockStats, 'linux')).toBe(false);
      });
    });

    describe('isReadonlyFile', () => {
      it('should detect readonly files', () => {
        const readonlyStats = { mode: 0o444 } as any; // No write permissions
        const writableStats = { mode: 0o644 } as any; // Has write permissions

        expect(extractor['isReadonlyFile'](readonlyStats)).toBe(true);
        expect(extractor['isReadonlyFile'](writableStats)).toBe(false);
      });
    });

    describe('getMimeTypeFromExtension', () => {
      it('should return correct MIME types', () => {
        expect(extractor['getMimeTypeFromExtension']('file.txt')).toBe('text/plain');
        expect(extractor['getMimeTypeFromExtension']('image.jpg')).toBe('image/jpeg');
        expect(extractor['getMimeTypeFromExtension']('unknown.xyz')).toBe(
          'application/octet-stream'
        );
      });
    });
  });
});
