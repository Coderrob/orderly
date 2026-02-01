import {
  FileExistsError,
  DirectoryNotFoundError,
  PermissionDeniedError
} from './file-operation-error';
import { ErrorCategory, ErrorCode } from './interfaces';

describe('File Operation Errors', () => {
  describe('FileExistsError', () => {
    it('should have FILE_EXISTS code', () => {
      const error = new FileExistsError('/path/to/file.txt');
      expect(error.code).toBe(ErrorCode.FILE_EXISTS);
    });

    it('should have FILE_OPERATION category', () => {
      const error = new FileExistsError('/path');
      expect(error.category).toBe(ErrorCategory.FILE_OPERATION);
    });

    it('should include path in message', () => {
      const error = new FileExistsError('/path/to/file.txt');
      expect(error.message).toContain('/path/to/file.txt');
    });
  });

  describe('DirectoryNotFoundError', () => {
    it('should have DIRECTORY_NOT_FOUND code', () => {
      const error = new DirectoryNotFoundError('/path/to/dir');
      expect(error.code).toBe(ErrorCode.DIRECTORY_NOT_FOUND);
    });

    it('should include path in message', () => {
      const error = new DirectoryNotFoundError('/path/to/dir');
      expect(error.message).toContain('/path/to/dir');
    });
  });

  describe('PermissionDeniedError', () => {
    it('should have PERMISSION_DENIED code', () => {
      const error = new PermissionDeniedError('/path', 'write');
      expect(error.code).toBe(ErrorCode.PERMISSION_DENIED);
    });

    it('should include path and operation in message', () => {
      const error = new PermissionDeniedError('/path', 'write');
      expect(error.message).toContain('/path');
      expect(error.message).toContain('write');
    });

    it('should store path and operation in context', () => {
      const error = new PermissionDeniedError('/path', 'write');
      expect(error.context?.path).toBe('/path');
      expect(error.context?.operation).toBe('write');
    });
  });
});
