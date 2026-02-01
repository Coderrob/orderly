import { OrderlyError } from './base-error';
import { ErrorCategory, ErrorCode } from './interfaces';

export class FileExistsError extends OrderlyError {
  readonly code = ErrorCode.FILE_EXISTS;
  readonly category = ErrorCategory.FILE_OPERATION;

  /**
   *
   * @param path
   */
  constructor(path: string) {
    super(`Target file already exists: ${path}`, { path });
  }
}

export class DirectoryNotFoundError extends OrderlyError {
  readonly code = ErrorCode.DIRECTORY_NOT_FOUND;
  readonly category = ErrorCategory.FILE_OPERATION;

  /**
   *
   * @param path
   */
  constructor(path: string) {
    super(`Directory does not exist: ${path}`, { path });
  }
}

export class PermissionDeniedError extends OrderlyError {
  readonly code = ErrorCode.PERMISSION_DENIED;
  readonly category = ErrorCategory.FILE_OPERATION;

  /**
   *
   * @param path
   * @param operation
   */
  constructor(path: string, operation: string) {
    super(`Permission denied: ${operation} on ${path}`, { path, operation });
  }
}
