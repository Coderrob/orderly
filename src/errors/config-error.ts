import { OrderlyError } from './base-error';
import { ErrorCategory, ErrorCode } from './interfaces';

export class ConfigNotFoundError extends OrderlyError {
  readonly code = ErrorCode.CONFIG_NOT_FOUND;
  readonly category = ErrorCategory.CONFIG;

  /**
   *
   * @param path
   */
  constructor(path: string) {
    super(`Config file not found: ${path}`, { path });
  }
}

export class UnsupportedConfigFormatError extends OrderlyError {
  readonly code = ErrorCode.UNSUPPORTED_CONFIG_FORMAT;
  readonly category = ErrorCategory.CONFIG;

  /**
   *
   * @param format
   */
  constructor(format: string) {
    super(`Unsupported config file format: ${format}`, { format });
  }
}

export class ConfigParseError extends OrderlyError {
  readonly code = ErrorCode.CONFIG_PARSE_ERROR;
  readonly category = ErrorCategory.CONFIG;

  /**
   *
   * @param path
   * @param cause
   */
  constructor(path: string, cause: string) {
    super(`Failed to parse config file: ${path}`, { path, cause });
  }
}
