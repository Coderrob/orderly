import { OrderlyError } from './base-error';
import { ErrorCategory, ErrorCode } from './interfaces';

export class InvalidPathError extends OrderlyError {
  readonly code = ErrorCode.INVALID_PATH;
  readonly category = ErrorCategory.VALIDATION;

  /**
   *
   * @param path
   * @param reason
   */
  constructor(path: string, reason?: string) {
    const message = reason ? `Invalid path: ${path} (${reason})` : `Invalid path: ${path}`;
    super(message, { path, reason });
  }
}

export class InvalidFormatError extends OrderlyError {
  readonly code = ErrorCode.INVALID_FORMAT;
  readonly category = ErrorCategory.VALIDATION;

  /**
   *
   * @param format
   * @param expected
   */
  constructor(format: string, expected: string) {
    super(`Invalid format: ${format}, expected: ${expected}`, { format, expected });
  }
}

export class InvalidConfigError extends OrderlyError {
  readonly code = ErrorCode.INVALID_CONFIG;
  readonly category = ErrorCategory.VALIDATION;

  /**
   *
   * @param field
   * @param value
   * @param reason
   */
  constructor(field: string, value: unknown, reason: string) {
    super(`Invalid configuration: ${field} = ${String(value)} (${reason})`, {
      field,
      value,
      reason
    });
  }
}
