import { OrderlyError } from './base-error';
import { ErrorCategory, ErrorCode } from './interfaces';

// Concrete implementation for testing abstract class
class TestError extends OrderlyError {
  readonly code = ErrorCode.FILE_NOT_FOUND;
  readonly category = ErrorCategory.FILE_OPERATION;
}

describe('OrderlyError', () => {
  describe('IOrderlyError contract', () => {
    it('should implement IOrderlyError interface', () => {
      const error = new TestError('Test message');

      // Then: Has all IOrderlyError properties
      expect(error.code).toBe(ErrorCode.FILE_NOT_FOUND);
      expect(error.category).toBe(ErrorCategory.FILE_OPERATION);
      expect(error.message).toBe('Test message');
    });

    it('should extend Error class', () => {
      const error = new TestError('Test');
      expect(error instanceof Error).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new TestError('Test');
      expect(error.stack).toBeDefined();
    });

    it('should handle environments without captureStackTrace', () => {
      // Mock Error.captureStackTrace as undefined
      const originalCaptureStackTrace = Error.captureStackTrace;
      delete (Error as any).captureStackTrace;

      const error = new TestError('Test');
      expect(error.stack).toBeDefined(); // Should still have stack from super()

      // Restore
      Error.captureStackTrace = originalCaptureStackTrace;
    });
  });

  describe('context property', () => {
    it('should store optional context data', () => {
      const error = new TestError('Test', { path: '/test/file.txt' });
      expect(error.context).toEqual({ path: '/test/file.txt' });
    });

    it('should be undefined when not provided', () => {
      const error = new TestError('Test');
      expect(error.context).toBeUndefined();
    });
  });

  describe('toJSON()', () => {
    it('should serialize to JSON with all properties', () => {
      const error = new TestError('File not found', { path: '/test' });
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'TestError',
        code: ErrorCode.FILE_NOT_FOUND,
        category: ErrorCategory.FILE_OPERATION,
        message: 'File not found',
        context: { path: '/test' }
      });
    });

    it('should produce valid JSON string', () => {
      const error = new TestError('Test');
      expect(() => JSON.stringify(error.toJSON())).not.toThrow();
    });
  });
});
