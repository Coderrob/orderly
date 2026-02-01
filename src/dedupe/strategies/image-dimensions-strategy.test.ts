import { ImageDimensionsStrategy } from '../strategies/image-dimensions-strategy';
import type { IMetadataExtractor } from '../interfaces';
import type { IScannedFile } from '../../scanner/interfaces';

/**
 * Unit tests for ImageDimensionsStrategy.
 */
describe('ImageDimensionsStrategy', () => {
  let strategy: ImageDimensionsStrategy;
  let mockMetadataExtractor: jest.Mocked<IMetadataExtractor>;

  const mockImageFile: IScannedFile = {
    originalPath: '/path/image.jpg',
    filename: 'image.jpg',
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

    strategy = new ImageDimensionsStrategy(mockMetadataExtractor);
  });

  describe('IDedupeStrategy contract', () => {
    it('should implement IDedupeStrategy interface', () => {
      expect(strategy).toBeDefined();
      expect(typeof strategy.name).toBe('string');
      expect(typeof strategy.priority).toBe('number');
      expect(typeof strategy.supports).toBe('function');
      expect(typeof strategy.getKey).toBe('function');
    });
  });

  describe('constructor', () => {
    it('should create strategy with correct properties', () => {
      expect(strategy.name).toBe('image-dimensions');
      expect(strategy.priority).toBe(20);
    });

    it('should create default metadata extractor when not provided', () => {
      const defaultStrategy = new ImageDimensionsStrategy();
      expect(defaultStrategy).toBeInstanceOf(ImageDimensionsStrategy);
    });
  });

  describe('supports', () => {
    it('should support image files', () => {
      expect(strategy.supports(mockImageFile)).toBe(true);
    });

    it('should not support non-image files', () => {
      expect(strategy.supports(mockTextFile)).toBe(false);
    });

    it('should support various image extensions', () => {
      const imageExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.bmp',
        '.webp',
        '.svg',
        '.tiff',
        '.tif'
      ];

      imageExtensions.forEach(ext => {
        const file: IScannedFile = {
          ...mockImageFile,
          filename: `test${ext}`,
          extension: ext
        };
        expect(strategy.supports(file)).toBe(true);
      });
    });

    it('should support image files with uppercase extension', () => {
      const file: IScannedFile = {
        ...mockImageFile,
        filename: 'image.JPG',
        extension: '.JPG'
      };
      expect(strategy.supports(file)).toBe(true);
    });
  });

  describe('getKey', () => {
    it('should return null when dimensions extraction fails', async () => {
      mockMetadataExtractor.extractDimensions.mockResolvedValue(null);

      const result = await strategy.getKey(mockImageFile);

      expect(result).toBeNull();
      expect(mockMetadataExtractor.extractDimensions).toHaveBeenCalledWith(
        mockImageFile.originalPath
      );
    });

    it('should generate key with dimensions', async () => {
      const mockDimensions = {
        width: 1920,
        height: 1080
      };

      mockMetadataExtractor.extractDimensions.mockResolvedValue(mockDimensions);

      const result = await strategy.getKey(mockImageFile);

      expect(result).toBe('width:1920|height:1080');
    });

    it('should generate key with string dimensions', async () => {
      const mockDimensions = {
        width: '1920',
        height: '1080'
      };

      mockMetadataExtractor.extractDimensions.mockResolvedValue(mockDimensions as any);

      const result = await strategy.getKey(mockImageFile);

      expect(result).toBe('width:1920|height:1080');
    });

    it('should handle dimensions with undefined properties', async () => {
      const mockDimensions = {} as any;

      mockMetadataExtractor.extractDimensions.mockResolvedValue(mockDimensions);

      const result = await strategy.getKey(mockImageFile);

      expect(result).toBe('width:undefined|height:undefined');
    });

    it('should handle extraction errors', async () => {
      mockMetadataExtractor.extractDimensions.mockRejectedValue(new Error('Extraction failed'));

      const result = await strategy.getKey(mockImageFile);

      expect(result).toBeNull();
    });
  });
});
