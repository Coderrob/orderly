import { OrderlyError } from './base-error';
import { ErrorCategory, ErrorCode } from './interfaces';

export class InvalidPathError extends OrderlyError {
  readonly code = ErrorCode.INVALID_PATH;
  readonly category = ErrorCategory.VALIDATION;

  /**
   * Creates an error for when a file path is invalid or malformed
   * @param path - The invalid file path
   * @param reason - Optional explanation of why the path is invalid
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
   * Creates an error for when a file or data format does not match expectations
   * @param format - The invalid format that was provided
   * @param expected - The expected format that should have been used
   */
  constructor(format: string, expected: string) {
    super(`Invalid format: ${format}, expected: ${expected}`, { format, expected });
  }
}

export class InvalidConfigError extends OrderlyError {
  readonly code = ErrorCode.INVALID_CONFIG;
  readonly category = ErrorCategory.VALIDATION;

  /**
   * Creates an error for when a configuration value is invalid
   * @param field - The configuration field that has an invalid value
   * @param value - The invalid value that was provided for the field
   * @param reason - The explanation of why this value is invalid for the field
   */
  constructor(field: string, value: unknown, reason: string) {
    super(`Invalid configuration: ${field} = ${String(value)} (${reason})`, {
      field,
      value,
      reason
    });
  }
}
