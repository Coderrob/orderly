import { ExifStrategy } from '../strategies/exif-strategy';
import type { IMetadataExtractor } from '../interfaces';
import type { IScannedFile } from '../../scanner/interfaces';

/**
 * Unit tests for ExifStrategy.
 */
describe('ExifStrategy', () => {
  let strategy: ExifStrategy;
  let mockMetadataExtractor: jest.Mocked<IMetadataExtractor>;

  const mockImageFile: IScannedFile = {
    originalPath: '/path/photo.jpg',
    filename: 'photo.jpg',
    extension: '.jpg',
    size: 1000,
    needsRename: false
  };

  const mockTextFile: IScannedFile = {
    originalPath: '/path/document.txt',
    filename: 'document.txt',
    extension: '.txt',
    size: 100,
    needsRename: false
  };

  beforeEach(() => {
    mockMetadataExtractor = {
      extractProperties: jest.fn(),
      extractAttributes: jest.fn(),
      extractDimensions: jest.fn(),
      extractExif: jest.fn()
    } as jest.Mocked<IMetadataExtractor>;

    strategy = new ExifStrategy(mockMetadataExtractor);
  });

  describe('constructor', () => {
    it('should create strategy with correct properties', () => {
      expect(strategy.name).toBe('exif');
      expect(strategy.priority).toBe(15);
    });

    it('should create default metadata extractor when not provided', () => {
      const defaultStrategy = new ExifStrategy();
      expect(defaultStrategy).toBeInstanceOf(ExifStrategy);
    });
  });

  describe('supports', () => {
    it('should support EXIF-compatible image files', () => {
      expect(strategy.supports(mockImageFile)).toBe(true);
    });

    it('should not support non-image files', () => {
      expect(strategy.supports(mockTextFile)).toBe(false);
    });

    it('should normalize uppercase extensions from filename', () => {
      const file: IScannedFile = {
        ...mockImageFile,
        filename: 'PHOTO.JPG',
        extension: '.JPG'
      };

      expect(strategy.supports(file)).toBe(true);
    });

    it('should use filename extension over provided extension field', () => {
      const file: IScannedFile = {
        ...mockImageFile,
        filename: 'photo.jpg',
        extension: '.txt'
      };

      expect(strategy.supports(file)).toBe(true);
    });

    it('should return false when filename has no extension', () => {
      const file: IScannedFile = {
        ...mockTextFile,
        filename: 'readme',
        extension: ''
      };

      expect(strategy.supports(file)).toBe(false);
    });

    it('should support EXIF-compatible extensions', () => {
      const exifExtensions = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.raw', '.cr2', '.nef'];

      exifExtensions.forEach(ext => {
        const file: IScannedFile = {
          ...mockImageFile,
          filename: `test${ext}`,
          extension: ext
        };
        expect(strategy.supports(file)).toBe(true);
      });
    });

    it('should not support non-EXIF extensions', () => {
      const nonExifExtensions = ['.gif', '.bmp', '.svg', '.txt', '.pdf'];

      nonExifExtensions.forEach(ext => {
        const file: IScannedFile = {
          ...mockTextFile,
          filename: `test${ext}`,
          extension: ext
        };
        expect(strategy.supports(file)).toBe(false);
      });
    });
  });

  describe('getKey', () => {
    it('should return null when EXIF extraction fails', async () => {
      mockMetadataExtractor.extractExif.mockResolvedValue(null);

      const result = await strategy.getKey(mockImageFile);

      expect(result).toBeNull();
      expect(mockMetadataExtractor.extractExif).toHaveBeenCalledWith(mockImageFile.originalPath);
    });

    it('should return null when EXIF data is empty', async () => {
      mockMetadataExtractor.extractExif.mockResolvedValue({});

      const result = await strategy.getKey(mockImageFile);

      expect(result).toBeNull();
    });

    it('should generate key with sorted EXIF data', async () => {
      const mockExifData = {
        DateTime: '2023:01:01 12:00:00',
        Make: 'Canon',
        Model: 'EOS R5',
        ISOSpeedRatings: '100'
      };

      mockMetadataExtractor.extractExif.mockResolvedValue(mockExifData);

      const result = await strategy.getKey(mockImageFile);

      // Keys should be sorted alphabetically
      expect(result).toBe(
        'DateTime:2023:01:01 12:00:00|ISOSpeedRatings:100|Make:Canon|Model:EOS R5'
      );
    });

    it('should handle single EXIF field', async () => {
      const mockExifData = {
        Make: 'Nikon'
      };

      mockMetadataExtractor.extractExif.mockResolvedValue(mockExifData);

      const result = await strategy.getKey(mockImageFile);

      expect(result).toBe('Make:Nikon');
    });

    it('should handle extraction errors', async () => {
      mockMetadataExtractor.extractExif.mockRejectedValue(new Error('Extraction failed'));

      const result = await strategy.getKey(mockImageFile);

      expect(result).toBeNull();
    });
  });
});
