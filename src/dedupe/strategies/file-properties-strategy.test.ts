import { FilePropertiesStrategy } from '../strategies/file-properties-strategy';
import type { IMetadataExtractor } from '../interfaces';
import type { IScannedFile } from '../../scanner/interfaces';

/**
 * Unit tests for FilePropertiesStrategy.
 */
describe('FilePropertiesStrategy', () => {
  let strategy: FilePropertiesStrategy;
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

    strategy = new FilePropertiesStrategy(mockMetadataExtractor);
  });

  describe('constructor', () => {
    it('should create strategy with correct properties', () => {
      expect(strategy.name).toBe('file-properties');
      expect(strategy.priority).toBe(30);
    });

    it('should create default metadata extractor when not provided', () => {
      const defaultStrategy = new FilePropertiesStrategy();
      expect(defaultStrategy).toBeInstanceOf(FilePropertiesStrategy);
    });
  });

  describe('supports', () => {
    it('should support all files', () => {
      expect(strategy.supports(mockFile)).toBe(true);
    });
  });

  describe('getKey', () => {
    it('should return null when metadata extraction fails', async () => {
      mockMetadataExtractor.extractProperties.mockResolvedValue(null);

      const result = await strategy.getKey(mockFile);

      expect(result).toBeNull();
      expect(mockMetadataExtractor.extractProperties).toHaveBeenCalledWith(mockFile.originalPath);
    });

    it('should generate key with all properties', async () => {
      const mockProperties = {
        createdAt: new Date('2023-01-01T00:00:00Z'),
        modifiedAt: new Date('2023-01-02T00:00:00Z'),
        mimeType: 'text/plain'
      };

      mockMetadataExtractor.extractProperties.mockResolvedValue(mockProperties);

      const result = await strategy.getKey(mockFile);

      expect(result).toBe('created:1672531200000|modified:1672617600000|mime:text/plain|size:100');
    });

    it('should generate key with partial properties', async () => {
      const mockProperties = {
        createdAt: new Date('2023-01-01T00:00:00Z'),
        mimeType: 'text/plain'
      };

      mockMetadataExtractor.extractProperties.mockResolvedValue(mockProperties);

      const result = await strategy.getKey(mockFile);

      expect(result).toBe('created:1672531200000|mime:text/plain|size:100');
    });

    it('should handle extraction errors', async () => {
      mockMetadataExtractor.extractProperties.mockRejectedValue(new Error('Extraction failed'));

      const result = await strategy.getKey(mockFile);

      expect(result).toBeNull();
    });
  });
});
