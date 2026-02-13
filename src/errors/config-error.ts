import { OrderlyError } from './base-error';
import { ErrorCategory, ErrorCode } from './interfaces';

export class ConfigNotFoundError extends OrderlyError {
  readonly code = ErrorCode.CONFIG_NOT_FOUND;
  readonly category = ErrorCategory.CONFIG;

  /**
   * Creates an error for when a configuration file cannot be found
   * @param path - The file path of the missing configuration file
   */
  constructor(path: string) {
    super(`Config file not found: ${path}`, { path });
  }
}

export class UnsupportedConfigFormatError extends OrderlyError {
  readonly code = ErrorCode.UNSUPPORTED_CONFIG_FORMAT;
  readonly category = ErrorCategory.CONFIG;

  /**
   * Creates an error for unsupported configuration file formats
   * @param format - The configuration file format that is not supported
   */
  constructor(format: string) {
    super(`Unsupported config file format: ${format}`, { format });
  }
}

export class ConfigParseError extends OrderlyError {
  readonly code = ErrorCode.CONFIG_PARSE_ERROR;
  readonly category = ErrorCategory.CONFIG;

  /**
   * Creates an error for when configuration file parsing fails
   * @param path - The file path of the configuration file that failed to parse
   * @param cause - The reason or error message describing why parsing failed
   */
  constructor(path: string, cause: string) {
    super(`Failed to parse config file: ${path}`, { path, cause });
  }
}
