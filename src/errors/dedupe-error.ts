import { OrderlyError } from './base-error';
import { ErrorCategory, ErrorCode } from './interfaces';

export class HashingError extends OrderlyError {
  readonly code = ErrorCode.HASHING_FAILED;
  readonly category = ErrorCategory.FILE_OPERATION;

  /**
   * Creates an error for when file hashing operations fail
   * @param path - The file path that failed to hash
   * @param cause - The reason or error message describing why hashing failed
   */
  constructor(path: string, cause: string) {
    super(`Failed to hash file: ${path}`, { path, cause });
  }
}

export class MetadataReadError extends OrderlyError {
  readonly code = ErrorCode.METADATA_READ_FAILED;
  readonly category = ErrorCategory.FILE_OPERATION;

  /**
   * Creates an error for when metadata reading operations fail
   * @param path - The file path from which metadata could not be read
   * @param metadataType - The type of metadata that failed to read (e.g., "modification time", "permissions")
   * @param cause - The reason or error message describing why metadata reading failed
   */
  constructor(path: string, metadataType: string, cause: string) {
    super(`Failed to read ${metadataType} metadata: ${path}`, { path, metadataType, cause });
  }
}

export class StrategyError extends OrderlyError {
  readonly code = ErrorCode.STRATEGY_FAILED;
  readonly category = ErrorCategory.VALIDATION;

  /**
   * Creates an error for when a deduplication strategy fails to execute
   * @param strategyName - The name of the strategy that failed
   * @param file - The file path for which the strategy failed
   * @param cause - The reason or error message describing why the strategy failed
   */
  constructor(strategyName: string, file: string, cause: string) {
    super(`Strategy '${strategyName}' failed for file: ${file}`, { strategyName, file, cause });
  }
}
