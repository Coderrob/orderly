import { OrderlyError } from './base-error';
import { ErrorCategory, ErrorCode } from './interfaces';

export class FileExistsError extends OrderlyError {
  readonly code = ErrorCode.FILE_EXISTS;
  readonly category = ErrorCategory.FILE_OPERATION;

  /**
   * Creates an error for when a target file already exists at the destination
   * @param path - The file path where the target file already exists
   */
  constructor(path: string) {
    super(`Target file already exists: ${path}`, { path });
  }
}

export class DirectoryNotFoundError extends OrderlyError {
  readonly code = ErrorCode.DIRECTORY_NOT_FOUND;
  readonly category = ErrorCategory.FILE_OPERATION;

  /**
   * Creates an error for when a required directory does not exist
   * @param path - The directory path that does not exist
   */
  constructor(path: string) {
    super(`Directory does not exist: ${path}`, { path });
  }
}

export class PermissionDeniedError extends OrderlyError {
  readonly code = ErrorCode.PERMISSION_DENIED;
  readonly category = ErrorCategory.FILE_OPERATION;

  /**
   * Creates an error for when permission is denied for a file operation
   * @param path - The file or directory path on which permission was denied
   * @param operation - The type of operation that was denied (e.g., "read", "write", "delete")
   */
  constructor(path: string, operation: string) {
    super(`Permission denied: ${operation} on ${path}`, { path, operation });
  }
}
