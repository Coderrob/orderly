import { InvalidPathError, InvalidFormatError, InvalidConfigError } from './validation-error';
import { ErrorCategory, ErrorCode } from './interfaces';

describe('Validation Errors', () => {
  describe('InvalidPathError', () => {
    it('should have INVALID_PATH code', () => {
      const error = new InvalidPathError('/invalid/path');
      expect(error.code).toBe(ErrorCode.INVALID_PATH);
    });

    it('should have VALIDATION category', () => {
      const error = new InvalidPathError('/path');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
    });

    it('should include path in message', () => {
      const error = new InvalidPathError('/invalid/path');
      expect(error.message).toContain('/invalid/path');
    });

    it('should include reason when provided', () => {
      const error = new InvalidPathError('/path', 'contains invalid characters');
      expect(error.message).toContain('contains invalid characters');
    });
  });

  describe('InvalidFormatError', () => {
    it('should have INVALID_FORMAT code', () => {
      const error = new InvalidFormatError('xml', 'json or yaml');
      expect(error.code).toBe(ErrorCode.INVALID_FORMAT);
    });

    it('should include format and expected in message', () => {
      const error = new InvalidFormatError('xml', 'json or yaml');
      expect(error.message).toContain('xml');
      expect(error.message).toContain('json or yaml');
    });

    it('should store format and expected in context', () => {
      const error = new InvalidFormatError('xml', 'json or yaml');
      expect(error.context?.format).toBe('xml');
      expect(error.context?.expected).toBe('json or yaml');
    });
  });

  describe('InvalidConfigError', () => {
    it('should have INVALID_CONFIG code', () => {
      const error = new InvalidConfigError('categories', [], 'must be array');
      expect(error.code).toBe(ErrorCode.INVALID_CONFIG);
    });

    it('should include field and reason in message', () => {
      const error = new InvalidConfigError('categories', [], 'must be array');
      expect(error.message).toContain('categories');
      expect(error.message).toContain('must be array');
    });

    it('should store field, value, and reason in context', () => {
      const error = new InvalidConfigError('categories', [], 'must be array');
      expect(error.context?.field).toBe('categories');
      expect(error.context?.value).toEqual([]);
      expect(error.context?.reason).toBe('must be array');
    });
  });
});
