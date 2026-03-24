import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
      const pngBuffer = createMinimalPngBuffer(640, 480);
      const tempDir = await createTempDir();
      const testFilePath = join(tempDir, 'image.png');

      try {
        await fs.writeFile(testFilePath, pngBuffer);

        const result = await extractor.extractDimensions(testFilePath);

        expect(result).toEqual({ width: 640, height: 480 });
      } finally {
        await removeTempDir(tempDir);
      }
    });

    it('should extract PNG dimensions without using fs.readFile for large files', async () => {
      const largePngBuffer = Buffer.concat([
        createMinimalPngBuffer(640, 480),
        Buffer.alloc(2 * 1024 * 1024, 0)
      ]);
      const readFileSpy = jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('unexpected'));
      const tempDir = await createTempDir();
      const testFilePath = join(tempDir, 'large-image.png');

      try {
        await fs.writeFile(testFilePath, largePngBuffer);

        const result = await extractor.extractDimensions(testFilePath);

        expect(result).toEqual({ width: 640, height: 480 });
        expect(readFileSpy).not.toHaveBeenCalled();
      } finally {
        readFileSpy.mockRestore();
        await removeTempDir(tempDir);
      }
    });
  });

  describe('extractExif', () => {
    it('should return null when file does not exist', async () => {
      const result = await extractor.extractExif('/path/image.jpg');
      expect(result).toBeNull();
    });

    it('should extract EXIF fields from a JPEG APP1 block', async () => {
      const jpegBuffer = createJpegWithExifMake('Canon');
      const tempDir = await createTempDir();
      const testFilePath = join(tempDir, 'exif.jpg');

      try {
        await fs.writeFile(testFilePath, jpegBuffer);

        const result = await extractor.extractExif(testFilePath);

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('Make', 'Canon');
      } finally {
        await removeTempDir(tempDir);
      }
    });

    it('should extract EXIF from a large JPEG without using fs.readFile', async () => {
      const jpegBuffer = Buffer.concat([
        createJpegWithExifMake('Canon'),
        Buffer.alloc(2 * 1024 * 1024, 0)
      ]);
      const readFileSpy = jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('unexpected'));
      const tempDir = await createTempDir();
      const testFilePath = join(tempDir, 'large-exif.jpg');

      try {
        await fs.writeFile(testFilePath, jpegBuffer);

        const result = await extractor.extractExif(testFilePath);

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('Make', 'Canon');
        expect(readFileSpy).not.toHaveBeenCalled();
      } finally {
        readFileSpy.mockRestore();
        await removeTempDir(tempDir);
      }
    });
  });

  describe('extractProperties', () => {
    it('should return null when file does not exist', async () => {
      const result = await extractor.extractProperties('/nonexistent/file.txt');
      expect(result).toBeNull();
    });

    it('should extract properties from existing file', async () => {
      const testContent = 'test content';
      const tempDir = await createTempDir();
      const testFilePath = join(tempDir, 'file.txt');

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
        await removeTempDir(tempDir);
      }
    });

    it('should extract properties from image file', async () => {
      const testContent = 'fake image content';
      const tempDir = await createTempDir();
      const testFilePath = join(tempDir, 'file.jpg');

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
        await removeTempDir(tempDir);
      }
    });
  });

  describe('extractAttributes', () => {
    it('should return null when file does not exist', async () => {
      const result = await extractor.extractAttributes('/nonexistent/file.txt');
      expect(result).toBeNull();
    });

    it('should extract attributes from existing file', async () => {
      const testContent = 'test content';
      const tempDir = await createTempDir();
      const testFilePath = join(tempDir, 'file-attributes.txt');

      try {
        await fs.writeFile(testFilePath, testContent, 'utf8');

        const result = await extractor.extractAttributes(testFilePath);

        expect(result).not.toBeNull();
        expect(typeof result?.hidden).toBe('boolean');
        expect(typeof result?.readonly).toBe('boolean');
        expect(typeof result?.system).toBe('boolean');
      } finally {
        await removeTempDir(tempDir);
      }
    });
  });

  describe('private methods', () => {
    describe('extractWithProgressiveRead', () => {
      it('should return null for non-JPEG buffers when initial extraction fails', async () => {
        const tempDir = await createTempDir();
        const testFilePath = join(tempDir, 'not-a-jpeg.bin');

        try {
          await fs.writeFile(testFilePath, Buffer.from('not-an-image', 'ascii'));

          const result = await extractor['extractWithProgressiveRead'](testFilePath, {
            run: () => null
          });

          expect(result).toBeNull();
        } finally {
          await removeTempDir(tempDir);
        }
      });

      it('should retry JPEG extraction with a larger prefix when needed', async () => {
        const tempDir = await createTempDir();
        const testFilePath = join(tempDir, 'delayed-exif.jpg');
        const app0Length = Buffer.alloc(2);
        app0Length.writeUInt16BE(72, 0);
        const delayedExif = Buffer.concat([
          Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
          app0Length,
          Buffer.alloc(70, 0),
          createJpegWithExifMake('Canon').subarray(2)
        ]);

        try {
          await fs.writeFile(testFilePath, delayedExif);

          const result = await extractor.extractExif(testFilePath);

          expect(result).toEqual({ Make: 'Canon' });
        } finally {
          await removeTempDir(tempDir);
        }
      });
    });

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

      it('should return false for system file checks on Windows', () => {
        const mockStats = { mode: 0o644 } as any;
        expect(
          extractor['isSystemFile'](
            String.raw`C:\Windows\System32\kernel32.dll`,
            mockStats,
            'win32'
          )
        ).toBe(false);
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

    describe('readFilePrefix', () => {
      it('should return only the bytes read from the file handle', async () => {
        const tempDir = await createTempDir();
        const testFilePath = join(tempDir, 'prefix.bin');
        const handle = await fs.open(testFilePath, 'w+');

        try {
          await handle.writeFile(Buffer.from([1, 2, 3, 4]));

          const prefix = await extractor['readFilePrefix'](handle, 10);

          expect([...prefix]).toEqual([1, 2, 3, 4]);
        } finally {
          await handle.close();
          await removeTempDir(tempDir);
        }
      });
    });

    describe('isJpeg', () => {
      it('should detect JPEG signatures', () => {
        expect(extractor['isJpeg'](Buffer.from([0xff, 0xd8, 0xff]))).toBe(true);
        expect(extractor['isJpeg'](Buffer.from([0xff]))).toBe(false);
        expect(extractor['isJpeg'](Buffer.from([0x89, 0x50]))).toBe(false);
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

async function createTempDir(): Promise<string> {
  return await fs.mkdtemp(join(tmpdir(), 'orderly-metadata-extractor-'));
}

async function removeTempDir(directoryPath: string): Promise<void> {
  try {
    await fs.rm(directoryPath, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
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
