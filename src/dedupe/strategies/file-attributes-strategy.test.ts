import { FileAttributesStrategy } from '../strategies/file-attributes-strategy';
import type { IMetadataExtractor } from '../interfaces';
import type { IScannedFile } from '../../scanner/interfaces';

/**
 * Unit tests for FileAttributesStrategy.
 */
describe('FileAttributesStrategy', () => {
  let strategy: FileAttributesStrategy;
  let mockMetadataExtractor: jest.Mocked<IMetadataExtractor>;

  const mockFile: IScannedFile = {
    originalPath: '/path/test.txt',
    filename: 'test.txt',
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

    strategy = new FileAttributesStrategy(mockMetadataExtractor);
  });

  describe('constructor', () => {
    it('should create strategy with correct properties', () => {
      expect(strategy.name).toBe('file-attributes');
      expect(strategy.priority).toBe(35);
    });

    it('should create default metadata extractor when not provided', () => {
      const defaultStrategy = new FileAttributesStrategy();
      expect(defaultStrategy).toBeInstanceOf(FileAttributesStrategy);
    });
  });

  describe('supports', () => {
    it('should support all files', () => {
      expect(strategy.supports(mockFile)).toBe(true);
    });
  });

  describe('getKey', () => {
    it('should return null when metadata extraction fails', async () => {
      mockMetadataExtractor.extractAttributes.mockResolvedValue(null);

      const result = await strategy.getKey(mockFile);

      expect(result).toBeNull();
      expect(mockMetadataExtractor.extractAttributes).toHaveBeenCalledWith(mockFile.originalPath);
    });

    it('should generate key with all attributes', async () => {
      const mockAttributes = {
        hidden: true,
        readonly: false,
        system: true
      };

      mockMetadataExtractor.extractAttributes.mockResolvedValue(mockAttributes);

      const result = await strategy.getKey(mockFile);

      expect(result).toBe('hidden:true|readonly:false|system:true');
    });

    it('should generate key with default false values for missing attributes', async () => {
      const mockAttributes = {
        hidden: true
      };

      mockMetadataExtractor.extractAttributes.mockResolvedValue(mockAttributes);

      const result = await strategy.getKey(mockFile);

      expect(result).toBe('hidden:true|readonly:false|system:false');
    });

    it('should handle extraction errors', async () => {
      mockMetadataExtractor.extractAttributes.mockRejectedValue(new Error('Extraction failed'));

      const result = await strategy.getKey(mockFile);

      expect(result).toBeNull();
    });
  });
});
