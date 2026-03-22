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
    it('should return null when file does not exist', async () => {
      const result = await extractor.extractDimensions('/path/image.jpg');
      expect(result).toBeNull();
    });

    it('should extract dimensions from a PNG file', async () => {
      const testFilePath = './test-temp-image.png';
      const pngBuffer = createMinimalPngBuffer(640, 480);

      try {
        await fs.writeFile(testFilePath, pngBuffer);

        const result = await extractor.extractDimensions(testFilePath);

        expect(result).toEqual({ width: 640, height: 480 });
      } finally {
        try {
          await fs.unlink(testFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('extractExif', () => {
    it('should return null when file does not exist', async () => {
      const result = await extractor.extractExif('/path/image.jpg');
      expect(result).toBeNull();
    });

    it('should extract EXIF fields from a JPEG APP1 block', async () => {
      const testFilePath = './test-temp-exif.jpg';
      const jpegBuffer = createJpegWithExifMake('Canon');

      try {
        await fs.writeFile(testFilePath, jpegBuffer);

        const result = await extractor.extractExif(testFilePath);

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('Make', 'Canon');
      } finally {
        try {
          await fs.unlink(testFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }
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

function createMinimalPngBuffer(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);

  // PNG signature
  buffer[0] = 0x89;
  buffer[1] = 0x50;
  buffer[2] = 0x4e;
  buffer[3] = 0x47;
  buffer[4] = 0x0d;
  buffer[5] = 0x0a;
  buffer[6] = 0x1a;
  buffer[7] = 0x0a;

  // IHDR chunk length and type
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');

  // IHDR width/height
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);

  return buffer;
}

function createJpegWithExifMake(make: string): Buffer {
  const makeWithNull = `${make}\u0000`;
  const makeBuffer = Buffer.from(makeWithNull, 'ascii');

  const tiffHeader = Buffer.alloc(8);
  tiffHeader.write('II', 0, 'ascii'); // little-endian
  tiffHeader.writeUInt16LE(42, 2);
  tiffHeader.writeUInt32LE(8, 4); // IFD0 offset

  const entryCount = Buffer.alloc(2);
  entryCount.writeUInt16LE(1, 0);

  // Single IFD0 entry: Make (0x010F), ASCII, count = make length, value offset = 26
  const entry = Buffer.alloc(12);
  entry.writeUInt16LE(0x010f, 0);
  entry.writeUInt16LE(2, 2);
  entry.writeUInt32LE(makeBuffer.length, 4);
  entry.writeUInt32LE(26, 8);

  const nextIfdOffset = Buffer.alloc(4); // 0 = no next IFD

  const tiff = Buffer.concat([tiffHeader, entryCount, entry, nextIfdOffset, makeBuffer]);
  const exifPayload = Buffer.concat([Buffer.from('Exif\u0000\u0000', 'ascii'), tiff]);

  const app1Length = Buffer.alloc(2);
  app1Length.writeUInt16BE(exifPayload.length + 2, 0);

  return Buffer.concat([
    Buffer.from([0xff, 0xd8]), // SOI
    Buffer.from([0xff, 0xe1]), // APP1 marker
    app1Length,
    exifPayload,
    Buffer.from([0xff, 0xd9]) // EOI
  ]);
}
