/**
 * Base interface for all Orderly errors.
 * Enables type-safe error handling and categorization.
 */
export interface IOrderlyError extends Error {
  /** Unique error code for programmatic handling */
  readonly code: string;

  /** Error category for grouping related errors */
  readonly category: ErrorCategory;

  /** Optional context data for debugging */
  readonly context?: Record<string, unknown>;
}

/**
 * Error categories for grouping and handling.
 */
export enum ErrorCategory {
  CONFIG = 'config',
  FILE_OPERATION = 'file-operation',
  VALIDATION = 'validation',
  SYSTEM = 'system'
}

/**
 * Error codes for all possible errors.
 */
export enum ErrorCode {
  // Config errors
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_PARSE_ERROR = 'CONFIG_PARSE_ERROR',
  UNSUPPORTED_CONFIG_FORMAT = 'UNSUPPORTED_CONFIG_FORMAT',

  // File operation errors
  FILE_EXISTS = 'FILE_EXISTS',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // Validation errors
  INVALID_PATH = 'INVALID_PATH',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_CONFIG = 'INVALID_CONFIG',

  // Dedupe errors
  HASHING_FAILED = 'HASHING_FAILED',
  METADATA_READ_FAILED = 'METADATA_READ_FAILED',
  STRATEGY_FAILED = 'STRATEGY_FAILED'
}
