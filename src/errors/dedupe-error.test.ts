import { HashingError, MetadataReadError, StrategyError } from './dedupe-error';
import { ErrorCategory, ErrorCode } from './interfaces';

describe('Dedupe Errors', () => {
  describe('HashingError', () => {
    it('should have HASHING_FAILED code', () => {
      const error = new HashingError('/path/to/file.txt', 'Hash computation failed');
      expect(error.code).toBe(ErrorCode.HASHING_FAILED);
    });

    it('should have FILE_OPERATION category', () => {
      const error = new HashingError('/path', 'error');
      expect(error.category).toBe(ErrorCategory.FILE_OPERATION);
    });

    it('should include path in message', () => {
      const error = new HashingError('/path/to/file.txt', 'error');
      expect(error.message).toContain('/path/to/file.txt');
    });

    it('should store path and cause in context', () => {
      const error = new HashingError('/path/to/file.txt', 'Hash computation failed');
      expect(error.context?.path).toBe('/path/to/file.txt');
      expect(error.context?.cause).toBe('Hash computation failed');
    });
  });

  describe('MetadataReadError', () => {
    it('should have METADATA_READ_FAILED code', () => {
      const error = new MetadataReadError('/path/to/file.jpg', 'EXIF', 'Read failed');
      expect(error.code).toBe(ErrorCode.METADATA_READ_FAILED);
    });

    it('should have FILE_OPERATION category', () => {
      const error = new MetadataReadError('/path', 'type', 'error');
      expect(error.category).toBe(ErrorCategory.FILE_OPERATION);
    });

    it('should include metadata type and path in message', () => {
      const error = new MetadataReadError('/path/to/file.jpg', 'EXIF', 'error');
      expect(error.message).toContain('EXIF metadata');
      expect(error.message).toContain('/path/to/file.jpg');
    });

    it('should store path, metadataType and cause in context', () => {
      const error = new MetadataReadError('/path/to/file.jpg', 'EXIF', 'Read failed');
      expect(error.context?.path).toBe('/path/to/file.jpg');
      expect(error.context?.metadataType).toBe('EXIF');
      expect(error.context?.cause).toBe('Read failed');
    });
  });

  describe('StrategyError', () => {
    it('should have STRATEGY_FAILED code', () => {
      const error = new StrategyError('NameStrategy', '/path/to/file.txt', 'Strategy failed');
      expect(error.code).toBe(ErrorCode.STRATEGY_FAILED);
    });

    it('should have VALIDATION category', () => {
      const error = new StrategyError('strategy', '/path', 'error');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
    });

    it('should include strategy name and file in message', () => {
      const error = new StrategyError('NameStrategy', '/path/to/file.txt', 'error');
      expect(error.message).toContain('NameStrategy');
      expect(error.message).toContain('/path/to/file.txt');
    });

    it('should store strategyName, file and cause in context', () => {
      const error = new StrategyError('NameStrategy', '/path/to/file.txt', 'Strategy failed');
      expect(error.context?.strategyName).toBe('NameStrategy');
      expect(error.context?.file).toBe('/path/to/file.txt');
      expect(error.context?.cause).toBe('Strategy failed');
    });
  });
});
